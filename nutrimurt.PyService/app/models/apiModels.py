# app/models/apiModels.py
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class Patient(BaseModel):
    id: int
    name: str
    email: str

class PatientLink(BaseModel):
    id: int
    urlId: str
    patient_id: int
    questionnary_id: int
    type: int
    last_answered: Optional[datetime] = None
    patient: Patient
    questionnary: Questionary

    class Config:
        extra = "ignore"
        orm_mode = True

class Questionary(BaseModel):
    id: int
    name: str
    questions: List[Question] = []
    createdAt: Optional[str] = None

    class Config:
        orm_mode = True

class Question(BaseModel):
    id: int
    questionText: str
    questionType: int
    alternatives: List[QuestionAlternative] = []
    answer: Optional[QuestionAnswer] = None
    answerAlternatives: List[str] = []

    class Config:
        orm_mode = True

class QuestionAlternative(BaseModel):
    id: int
    alternative: str

    class Config:
        orm_mode = True

class QuestionAnswer(BaseModel):
    id: Optional[int] = None
    answer: str = ""

    class Config:
        orm_mode = True




