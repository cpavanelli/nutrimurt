from dotenv import load_dotenv
import sqlalchemy as sa
from sqlalchemy.orm import joinedload, Session
from app.models.models import Patients, PatientLinks, Questionaries, Questions
from app.settings import settings

engine = sa.create_engine(settings.CONNECTION_STRING)
SessionLocal = sa.orm.sessionmaker(bind=engine)

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class Database:
    engine: sa.engine.Engine
    session: sa.orm.session.Session
    connection_string: str

    def __init__(self, session: Session = None):
        self.session = session
        load_dotenv()

    def get_Patient(self, patient_id: int):
          with self.session as session:
            return session.query(Patients).filter(Patients.id == patient_id).first()

    def get_PatientLink(self, urlID: str):
          with self.session as session:
            return session.query(PatientLinks)\
            .options(joinedload(PatientLinks.patient), 
                     joinedload(PatientLinks.questionnary).joinedload(Questionaries.questions)
                     ).filter(PatientLinks.urlID == urlID).first()

    def get_Questionary(self, urlID: str):
          with self.session as session:
            return (session.query(PatientLinks)
            .options(joinedload(PatientLinks.patient), 
                     joinedload(PatientLinks.questionnary).joinedload(Questionaries.questions)
                     .joinedload(Questions.alternatives)
                     ).filter(PatientLinks.urlID == urlID).first())