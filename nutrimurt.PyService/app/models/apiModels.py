# app/models/apiModels.py
from __future__ import annotations

from datetime import date, datetime
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
    questionnary_id: Optional[int] = None
    diary_id: Optional[int] = None
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


class DiaryEntry(BaseModel):
    id: int
    date: date
    time: datetime
    food: str
    amount: str

    class Config:
        orm_mode = True


class Diary(BaseModel):
    id: int
    name: str
    entries: List[DiaryEntry] = []

    class Config:
        orm_mode = True


class DiaryPatientLink(BaseModel):
    id: int
    urlId: str
    patient_id: int
    diary_id: Optional[int] = None
    type: int
    last_answered: Optional[datetime] = None
    patient: Patient
    diary: Diary

    class Config:
        extra = "ignore"
        orm_mode = True


