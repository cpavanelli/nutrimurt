
export interface Questionary {
  id: number;
  name: string;
  questions: Question[];
  createdAt: string;
}

export interface Question {
  id: number;
  questionText: string;
  questionType: number;
  alternatives?: QuestionAlternative[];
  createdAt: string;
  answer: QuestionAnswer;
  answerAlternatives: string[];
}

export interface QuestionAlternative {
  id: number;
  alternative: string;
}

export interface QuestionAnswer {
  id: number;
  answer: string;
}

export type QuestionaryInput = Omit<Questionary, 'id' | 'createdAt'>;
export type QuestionInput = Omit<Question, 'id' | 'createdAt'>;
export type AlternativeInput = Omit<QuestionAlternative, 'id'>;

export interface PatientLink {
  id: number;
  urlId: string;
  patientId: number;
  questionnaryId: number;
  questionnaryName: string;
  diaryName: string;
  type: PatientLinkType;
  createdAt: string;
  questionnary: Questionary;
  diaryId: number;
  diary: PatientDiary;
}

export type PatientLinkInput = Omit<PatientLink, 'id' | 'createdAt'>;

export type PatientLinkType = 'question' | 'diary' | 1 | 2;

export interface PatientDiary{
  id: number;
  name: string;
  entries: DiaryEntry[];
}

export interface DiaryEntry {
  id: number;
  date: string;
  mealType: number;
  time: string | null;
  food: string;
  amount: string;
  patientDiaryId?: number;
}

export const MEAL_TYPE_LABELS: Record<number, string> = {
  1: 'Cafe da manha',
  2: 'Almoco',
  3: 'Cafe da tarde',
  4: 'Jantar',
  5: 'Lanche',
};

export const MEAL_TYPES = [1, 2, 3, 4, 5] as const;

export type DiaryDayInput = {
  date: string;
  entries: Omit<DiaryEntry, 'id' | 'patientDiaryId'>[];
}