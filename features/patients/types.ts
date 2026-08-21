export interface Patient {
  id: number;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birth?: string | null;
  weight: number;
  height: number;
  createdAt: string;
}

export type PatientInput = Omit<Patient, 'id' | 'createdAt'>;

export type PatientLinkType = 'question' | 'diary' | 1 | 2;

export interface PatientLink {
  id: number;
  patientId: number;
  urlId: string;
  questionnaryName: string;
  type: PatientLinkType;
  questionnaryId: number;
  diaryId: number;
  lastAnswered?: string | null;
  diaryName?: string | null;
}

export interface SendLinksInput {
  type: 'question' | 'diary';        // diaries later
  questionaryId?: number;
  diaryName?: string;        
}

export interface PatientWithLinks extends Patient {
  patientLinks: PatientLink[];
}
