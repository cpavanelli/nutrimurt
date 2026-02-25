import sqlalchemy as sa
from sqlalchemy.orm import Session, joinedload

from app.models.models import (
    PatientLinks,
    PatientQuestionAnswer,
    PatientQuestionAnswerAlternative,
    Patients,
    Questionaries,
    Questions,
)
from app.settings import settings

engine = sa.create_engine(settings.CONNECTION_STRING, pool_pre_ping=True)
SessionLocal = sa.orm.sessionmaker(bind=engine)


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

    def get_PatientLinkForAnswer(self, urlId: str) -> PatientLinks | None:
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
