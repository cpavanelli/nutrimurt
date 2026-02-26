from collections import defaultdict

from app.data.database import Database
from app.models.apiModels import (
    Diary,
    DiaryEntry,
    DiaryPatientLink,
    Patient,
    PatientLink,
    Question,
    QuestionAlternative,
    QuestionAnswer,
    Questionary,
)
from app.models.models import PatientQuestionAnswer, PatientQuestionAnswerAlternative


class Answers:
    def savePatientAnswers(self, patient_link: PatientLink, db: Database):
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

    def getQuestionaryPatientLink(self, urlId: str, db: Database) -> PatientLink | None:
        dbPatientLink = db.get_QuestionaryPatientLinkForAnswer(urlId)
        if not dbPatientLink:
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
        )

    def getDiaryPatientLink(self, urlId: str, db: Database) -> DiaryPatientLink | None:
        dbPatientLink = db.get_DiaryPatientLinkForAnswer(urlId)
        if not dbPatientLink or not dbPatientLink.diary:
            return None

        return DiaryPatientLink(
            id=dbPatientLink.id,
            urlId=dbPatientLink.urlId,
            patient_id=dbPatientLink.patient_id,
            diary_id=dbPatientLink.diary_id,
            type=dbPatientLink.type,
            last_answered=dbPatientLink.last_answered,
            patient=Patient(
                id=dbPatientLink.patient.id,
                name=dbPatientLink.patient.name,
                email=dbPatientLink.patient.email,
            ),
            diary=Diary(
                id=dbPatientLink.diary.id,
                name=dbPatientLink.diary.name,
                entries=[
                    DiaryEntry(
                        id=entry.id,
                        date=entry.date,
                        time=entry.time,
                        food=entry.food,
                        amount=entry.amount,
                    )
                    for entry in dbPatientLink.diary.entries
                ],
            ),
        )
