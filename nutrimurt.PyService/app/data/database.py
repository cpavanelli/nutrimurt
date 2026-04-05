from datetime import datetime, timezone

import sqlalchemy as sa
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.constants.guardrails import Guardrails
from app.models.models import (
    PatientDiaries,
    PatientDiaryEntries,
    PatientLinks,
    PatientQuestionAnswer,
    PatientQuestionAnswerAlternative,
    Patients,
    Questionaries,
    Questions,
    UserEmailSendCounters,
)
from app.settings import settings

engine = sa.create_engine(settings.CONNECTION_STRING, pool_pre_ping=True)
SessionLocal = sa.orm.sessionmaker(bind=engine)


class DailyEmailLimitExceeded(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=409,
            detail=f"Você atingiu o limite diário de {Guardrails.MAX_EMAIL_SENDS_PER_DAY} e-mails por dia UTC.",
        )


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Database:
    def __init__(self, session: Session | None = None):
        self.session = session or SessionLocal()

    def get_Patient(self, patient_id: int):
        return self.session.query(Patients).filter(Patients.id == patient_id).first()

    def get_PatientLink(self, urlId: str):
        return (
            self.session.query(PatientLinks)
            .options(
                joinedload(PatientLinks.patient),
                joinedload(PatientLinks.questionnary).joinedload(Questionaries.questions),
            )
            .filter(PatientLinks.urlId == urlId)
            .first()
        )

    def reserve_email_send_slot(self, user_id: str):
        today = datetime.now(timezone.utc).date()
        now = datetime.now(timezone.utc)

        for attempt in range(2):
            try:
                counter = (
                    self.session.query(UserEmailSendCounters)
                    .filter(UserEmailSendCounters.user_id == user_id)
                    .with_for_update()
                    .first()
                )

                if counter is None:
                    counter = UserEmailSendCounters(
                        user_id=user_id,
                        window_date=today,
                        send_count=1,
                        updated_at=now,
                    )
                    self.session.add(counter)
                    self.session.commit()
                    return

                if counter.window_date != today:
                    counter.window_date = today
                    counter.send_count = 1
                elif counter.send_count >= Guardrails.MAX_EMAIL_SENDS_PER_DAY:
                    self.session.rollback()
                    raise DailyEmailLimitExceeded()
                else:
                    counter.send_count += 1

                counter.updated_at = now
                self.session.commit()
                return
            except DailyEmailLimitExceeded:
                raise
            except IntegrityError:
                self.session.rollback()
                if attempt == 0:
                    continue
                raise
            except Exception:
                self.session.rollback()
                raise

        raise RuntimeError("Unable to reserve email send slot.")

    def get_Questionary(self, urlId: str):
        patient_link = (
            self.session.query(PatientLinks)
            .options(
                joinedload(PatientLinks.questionnary)
                .joinedload(Questionaries.questions)
                .joinedload(Questions.alternatives)
            )
            .filter(PatientLinks.urlId == urlId)
            .first()
        )
        return patient_link.questionnary if patient_link else None

    def get_QuestionaryPatientLinkForAnswer(self, urlId: str) -> PatientLinks | None:
        return (
            self.session.query(PatientLinks)
            .options(
                joinedload(PatientLinks.patient),
                joinedload(PatientLinks.questionnary)
                .joinedload(Questionaries.questions)
                .joinedload(Questions.alternatives),
                joinedload(PatientLinks.answers),
                joinedload(PatientLinks.answer_alternatives),
            )
            .filter(PatientLinks.urlId == urlId)
            .first()
        )

    def get_DiaryPatientLinkForAnswer(self, urlId: str) -> PatientLinks | None:
        return (
            self.session.query(PatientLinks)
            .options(
                joinedload(PatientLinks.patient),
                joinedload(PatientLinks.diary).joinedload(PatientDiaries.entries),
            )
            .filter(PatientLinks.urlId == urlId)
            .first()
        )

    def savePatientAnswers(
        self,
        answers: list[PatientQuestionAnswer],
        answerAlternatives: list[PatientQuestionAnswerAlternative],
        patient_link_id: int,
    ):
        for answer in answers:
            self.session.add(answer)
        for alt in answerAlternatives:
            self.session.add(alt)
        self.session.query(PatientLinks).filter(
            PatientLinks.id == patient_link_id
        ).update(
            {PatientLinks.last_answered: sa.func.now()},
            synchronize_session=False,
        )
        self.session.commit()

    def delete_patient_answers(self, patient_link_id: int):
        self.session.query(PatientQuestionAnswerAlternative).filter(
            PatientQuestionAnswerAlternative.patient_link_id == patient_link_id
        ).delete(synchronize_session=False)
        self.session.query(PatientQuestionAnswer).filter(
            PatientQuestionAnswer.patient_link_id == patient_link_id
        ).delete(synchronize_session=False)
        self.session.commit()
        
    def savePatientDiaryEntries(
        self,
        entries: list[PatientDiaryEntries],
        patient_link_id: int,
    ):
        for entry in entries:
            self.session.add(entry)
        self.session.commit()
      
        self.session.query(PatientLinks).filter(
            PatientLinks.id == patient_link_id
        ).update(
            {PatientLinks.last_answered: sa.func.now()},
            synchronize_session=False,
        )
        self.session.commit()
        
    def delete_patient_diary_entries(self, patient_link_id: int):
        patient_link = self.session.query(PatientLinks).filter(
            PatientLinks.id == patient_link_id
        ).first()
        if not patient_link or not patient_link.diary_id:
            return

        self.session.query(PatientDiaryEntries).filter(
            PatientDiaryEntries.patient_diary_id == patient_link.diary_id
        ).delete(synchronize_session=False)
        self.session.commit()
