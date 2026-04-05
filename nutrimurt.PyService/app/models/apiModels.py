# app/models/apiModels.py
from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

class Patient(BaseModel):
    id: Optional[int] = None
    name: str
    email: Optional[str] = None

class PatientLink(BaseModel):
    id: int
    urlId: str
    patient_id: Optional[int] = None
    questionnary_id: Optional[int] = None
    diary_id: Optional[int] = None
    type: int
    last_answered: Optional[datetime] = None
    patient: Patient
    questionnary: Optional[Questionary] = None
    diary: Optional[Diary] = None

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

    @field_validator("answerAlternatives", mode="before")
    @classmethod
    def validate_alternative_lengths(cls, v):
        for item in v:
            if isinstance(item, str) and len(item) > 500:
                raise ValueError("Alternative text exceeds maximum length of 500 characters")
        return v

    class Config:
        orm_mode = True

class QuestionAlternative(BaseModel):
    id: int
    alternative: str

    class Config:
        orm_mode = True

class QuestionAnswer(BaseModel):
    id: Optional[int] = None
    answer: str = Field(default="", max_length=500)

    class Config:
        orm_mode = True


class DiaryEntry(BaseModel):
    id: Optional[int] = None
    date: date
    mealType: int
    time: str | None = None
    food: str = Field(max_length=500)
    amount: str = Field(max_length=200)

    class Config:
        orm_mode = True


class Diary(BaseModel):
    id: int
    name: str
    entries: List[DiaryEntry] = []

    class Config:
        orm_mode = True


class PublicPatient(BaseModel):
    name: str


class PublicPatientLink(BaseModel):
    """PatientLink shape returned to unauthenticated patients — no PII beyond name."""
    id: int
    urlId: str
    type: int
    last_answered: Optional[datetime] = None
    patient: PublicPatient
    questionnary: Optional[Questionary] = None
    diary: Optional[Diary] = None

