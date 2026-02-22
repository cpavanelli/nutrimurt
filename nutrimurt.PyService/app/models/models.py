# app/models/models.py
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, declarative_base, mapped_column, relationship

Base = declarative_base()


class Patients(Base):
    __tablename__ = 'patients'

    id: Mapped[int] = mapped_column('id', primary_key=True)
    name: Mapped[str] = mapped_column('name')
    email: Mapped[str] = mapped_column('email')
    phone: Mapped[str] = mapped_column('phone')
    cpf: Mapped[str] = mapped_column('cpf')
    patient_links: Mapped[list['PatientLinks']] = relationship('PatientLinks', back_populates='patient')


class PatientLinks(Base):
    __tablename__ = 'patient_links'

    id: Mapped[int] = mapped_column('id', primary_key=True)
    urlID: Mapped[str] = mapped_column('url_id')
    type: Mapped[int] = mapped_column('type')
    patient_id: Mapped[int] = mapped_column('patient_id', ForeignKey('patients.id'))
    questionnary_id: Mapped[int] = mapped_column('questionnary_id', ForeignKey('questionnaries.id'))
    diary_id: Mapped[int | None] = mapped_column('diary_id', nullable=True)

    patient: Mapped['Patients'] = relationship('Patients', back_populates='patient_links')
    questionnary: Mapped['Questionaries'] = relationship('Questionaries', back_populates='patient_links')
    answers: Mapped[list['PatientQuestionAnswer']] = relationship('PatientQuestionAnswer', back_populates='patient_link')
    answer_alternatives: Mapped[list['PatientQuestionAnswerAlternative']] = relationship(
        'PatientQuestionAnswerAlternative',
        back_populates='patient_link'
    )


class Questionaries(Base):
    __tablename__ = 'questionnaries'

    id: Mapped[int] = mapped_column('id', primary_key=True)
    name: Mapped[str] = mapped_column('name')

    patient_links: Mapped[list['PatientLinks']] = relationship('PatientLinks', back_populates='questionnary')
    questions: Mapped[list['Questions']] = relationship('Questions', back_populates='questionnary')


class Questions(Base):
    __tablename__ = 'questions'

    id: Mapped[int] = mapped_column('id', primary_key=True)
    questionText: Mapped[str] = mapped_column('question_text')
    questionType: Mapped[int] = mapped_column('question_type')
    questionnary_id: Mapped[int] = mapped_column('questionnary_id', ForeignKey('questionnaries.id'))

    questionnary: Mapped['Questionaries'] = relationship('Questionaries', back_populates='questions')
    alternatives: Mapped[list['QuestionAlternative']] = relationship('QuestionAlternative', back_populates='question')


class QuestionAlternative(Base):
    __tablename__ = 'question_alternatives'

    id: Mapped[int] = mapped_column('id', primary_key=True)
    alternative: Mapped[str] = mapped_column('alternative')
    question_id: Mapped[int | None] = mapped_column('question_id', ForeignKey('questions.id'), nullable=True)

    question: Mapped['Questions'] = relationship('Questions', back_populates='alternatives')


class PatientQuestionAnswer(Base):
    __tablename__ = 'patient_question_answers'

    id: Mapped[int] = mapped_column('id', primary_key=True)
    patient_link_id: Mapped[int] = mapped_column('patient_link_id', ForeignKey('patient_links.id'))
    question_id: Mapped[int] = mapped_column('question_id', ForeignKey('questions.id'))
    answer: Mapped[str] = mapped_column('answer')

    patient_link: Mapped['PatientLinks'] = relationship('PatientLinks', back_populates='answers')


class PatientQuestionAnswerAlternative(Base):
    __tablename__ = 'patient_question_answer_alternatives'

    id: Mapped[int] = mapped_column('id', primary_key=True)
    patient_link_id: Mapped[int] = mapped_column('patient_link_id', ForeignKey('patient_links.id'))
    question_id: Mapped[int] = mapped_column('question_id', ForeignKey('questions.id'))
    alternative: Mapped[str] = mapped_column('alternative')

    patient_link: Mapped['PatientLinks'] = relationship('PatientLinks', back_populates='answer_alternatives')
