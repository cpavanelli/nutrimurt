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
  alternatives?: AlternativeInput[];
  createdAt: string;
}

export interface QuestionAlternative {
  id: number;
  alternative: string;
}

export type QuestionaryInput = Omit<Questionary, 'id' | 'createdAt'>;
export type QuestionInput = Omit<Question, 'id' | 'createdAt'>;
export type AlternativeInput = Omit<QuestionAlternative, 'id'>;