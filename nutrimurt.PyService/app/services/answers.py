from collections import Counter, defaultdict
from datetime import datetime

from fastapi import HTTPException

from app.constants.guardrails import Guardrails
from app.data.database import Database
from app.models.apiModels import (
    Diary,
    DiaryEntry,
    Patient,
    PatientLink,
    Question,
    QuestionAlternative,
    QuestionAnswer,
    Questionary,
)
from app.models.models import PatientDiaryEntries, PatientQuestionAnswer, PatientQuestionAnswerAlternative


class Answers:
    @staticmethod
    def _to_entry_datetime(entry_date, entry_time: str | None) -> datetime | None:
        if not entry_time:
            return None
        if "T" in entry_time:
            return datetime.fromisoformat(entry_time.replace("Z", "+00:00"))
        return datetime.fromisoformat(f"{entry_date.isoformat()}T{entry_time}:00")

    def savePatientAnswers(self, patient_link: PatientLink, db: Database):
        if patient_link.type == 1 and patient_link.questionnary:
            db.delete_patient_answers(patient_link.id)

            answersToSave: list[PatientQuestionAnswer] = []
            answersAlternativesToSave: list[PatientQuestionAnswerAlternative] = []

            for q in patient_link.questionnary.questions:
                if q.questionType != 3:
                    answersToSave.append(
                        PatientQuestionAnswer(
                            patient_link_id=patient_link.id,
                            question_id=q.id,
                            answer=(q.answer.answer if q.answer else ""),
                        )
                    )
                else:
                    for a in q.answerAlternatives:
                        answersAlternativesToSave.append(
                            PatientQuestionAnswerAlternative(
                                patient_link_id=patient_link.id,
                                question_id=q.id,
                                alternative=a,
                            )
                        )

            db.savePatientAnswers(answersToSave, answersAlternativesToSave, patient_link.id)
            return

        if patient_link.type == 2 and patient_link.diary:
            self.savePatientDiaryAnswers(patient_link, db)
            return

        raise ValueError("Invalid PatientLink payload for savePatientAnswers")

    def savePatientDiaryAnswers(self, patient_link: PatientLink, db: Database):
        if not patient_link.diary:
            raise ValueError("Diary payload is required for diary answers")

        entries_per_day = Counter(e.date for e in patient_link.diary.entries)
        for day, count in entries_per_day.items():
            if count > Guardrails.MAX_DIARY_ENTRIES_PER_DAY:
                raise HTTPException(
                    status_code=409,
                    detail="Você atingiu o número máximo de entradas por dia.",
                )

        db.delete_patient_diary_entries(patient_link.id)

        diary_id = patient_link.diary_id or patient_link.diary.id

        entriesToSave: list[PatientDiaryEntries] = []

        for e in patient_link.diary.entries:
            entriesToSave.append(
                PatientDiaryEntries(
                    patient_diary_id=diary_id,
                    date=e.date,
                    meal_type=e.mealType,
                    time=self._to_entry_datetime(e.date, e.time),
                    food=e.food,
                    amount=e.amount
                )
            )
            
        db.savePatientDiaryEntries(entriesToSave, patient_link.id)

    def savePatientDiary(self, patient_link: PatientLink, db: Database):
        self.savePatientDiaryAnswers(patient_link, db)

    def getQuestionaryPatientLink(self, urlId: str, db: Database) -> PatientLink | None:
        dbPatientLink = db.get_QuestionaryPatientLinkForAnswer(urlId)
        if not dbPatientLink or not dbPatientLink.questionnary:
            return None

        text_answers_by_question = {}
        for answer in dbPatientLink.answers:
            question_id = answer.question_id
            text_answers_by_question[question_id] = answer
        alternatives_by_question: dict[int, list[str]] = defaultdict(list)
        for alt in dbPatientLink.answer_alternatives:
            alternatives_by_question[alt.question_id].append(alt.alternative)

        questions: list[Question] = []
        for db_question in dbPatientLink.questionnary.questions:
            question = Question(
                id=db_question.id,
                questionText=db_question.questionText,
                questionType=db_question.questionType,
                alternatives=[
                    QuestionAlternative(id=alt.id, alternative=alt.alternative)
                    for alt in db_question.alternatives
                ],
                answerAlternatives=alternatives_by_question.get(db_question.id, []),
            )

            if db_question.questionType != 3:
                saved_answer = text_answers_by_question.get(db_question.id)
                question.answer = QuestionAnswer(
                    id=(saved_answer.id if saved_answer else None),
                    answer=(saved_answer.answer if saved_answer else ""),
                )

            questions.append(question)

        return PatientLink(
            id=dbPatientLink.id,
            urlId=dbPatientLink.urlId,
            patient_id=dbPatientLink.patient_id,
            questionnary_id=dbPatientLink.questionnary_id,
            diary_id=dbPatientLink.diary_id,
            type=dbPatientLink.type,
            last_answered=dbPatientLink.last_answered,
            patient=Patient(
                id=dbPatientLink.patient.id,
                name=dbPatientLink.patient.name,
                email=dbPatientLink.patient.email,
            ),
            questionnary=Questionary(
                id=dbPatientLink.questionnary.id,
                name=dbPatientLink.questionnary.name,
                questions=questions,
            ),
            diary=None,
        )

    def getDiaryPatientLink(self, urlId: str, db: Database) -> PatientLink | None:
        dbPatientLink = db.get_DiaryPatientLinkForAnswer(urlId)
        if not dbPatientLink or not dbPatientLink.diary:
            return None

        return PatientLink(
            id=dbPatientLink.id,
            urlId=dbPatientLink.urlId,
            patient_id=dbPatientLink.patient_id,
            questionnary_id=dbPatientLink.questionnary_id,
            diary_id=dbPatientLink.diary_id,
            type=dbPatientLink.type,
            last_answered=dbPatientLink.last_answered,
            patient=Patient(
                id=dbPatientLink.patient.id,
                name=dbPatientLink.patient.name,
                email=dbPatientLink.patient.email,
            ),
            questionnary=None,
            diary=Diary(
                id=dbPatientLink.diary.id,
                name=dbPatientLink.diary.name,
                entries=[
                    DiaryEntry(
                        id=entry.id,
                        date=entry.date,
                        mealType=entry.meal_type,
                        time=entry.time.strftime("%H:%M") if entry.time else None,
                        food=entry.food,
                        amount=entry.amount,
                    )
                    for entry in sorted(
                        dbPatientLink.diary.entries,
                        key=lambda e: (e.date, e.meal_type, (0, e.time) if e.time else (1,)),
                    )
                ],
            ),
        )
