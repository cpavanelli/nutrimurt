# app/models/models.py
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, declarative_base, relationship


Base = declarative_base()

class Patients(Base):
        __tablename__ = 'Patients'
        id : Mapped[int] = mapped_column("Id",primary_key=True)
        name : Mapped[str] = mapped_column("Name")
        email : Mapped[str] = mapped_column("Email")
        patient_links: Mapped[list["PatientLinks"]] = relationship("PatientLinks", back_populates="patient")

class PatientLinks(Base):
        __tablename__ = 'PatientLinks'
        id: Mapped[int] = mapped_column("Id",primary_key=True)
        urlID : Mapped[str] = mapped_column("UrlID")
        type : Mapped[str] = mapped_column("Type")
        patient_id: Mapped[int] = mapped_column("PatientId", ForeignKey('Patients.Id'))
        questionnary_id: Mapped[int] = mapped_column("QuestionnaryId", ForeignKey('Questionnaries.Id'))
        patient: Mapped["Patients"] = relationship("Patients", back_populates="patient_links")
        questionnary: Mapped["Questionaries"] = relationship("Questionaries", back_populates="patient_links")


class Questionaries(Base):
        __tablename__ = 'Questionnaries'
        id: Mapped[int] = mapped_column("Id",primary_key=True)
        name : Mapped[str] = mapped_column("Name")
        patient_links: Mapped[list["PatientLinks"]] = relationship("PatientLinks", back_populates="questionnary")
        questions: Mapped[list["Questions"]] = relationship("Questions", back_populates="questionnary")

class Questions(Base):
        __tablename__ = 'Questions'
        id: Mapped[int] = mapped_column("Id", primary_key=True)
        text: Mapped[str] = mapped_column("QuestionText")
        question_type: Mapped[int] = mapped_column("QuestionType")
        questionnary_id: Mapped[int] = mapped_column("QuestionnaryId", ForeignKey('Questionnaries.Id'))
        questionnary: Mapped["Questionaries"] = relationship("Questionaries", back_populates="questions")
        alternatives: Mapped[list["QuestionAlternative"]] = relationship("QuestionAlternative", back_populates="question")

class QuestionAlternative(Base):
        __tablename__ = 'QuestionAlternatives'
        id: Mapped[int] = mapped_column("Id", primary_key=True)
        alternative: Mapped[str] = mapped_column("Alternative")
        question_id: Mapped[int] = mapped_column("QuestionId", ForeignKey('Questions.Id'))
        question: Mapped["Questions"] = relationship("Questions", back_populates="alternatives")