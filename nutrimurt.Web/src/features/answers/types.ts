
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
  type: PatientLinkType;
  createdAt: string;
  questionnary: Questionary;
}

export type PatientLinkInput = Omit<PatientLink, 'id' | 'createdAt'>;

export type PatientLinkType = 'question' | 'diary';