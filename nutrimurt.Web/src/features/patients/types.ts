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

export type PatientLinkType = 'question' | 'diary';

export interface PatientLink {
  id: number;
  patientId: number;
  urlId: string;
  questionnaryName: string;
  type: PatientLinkType;
  questionnaryId: number;
  diaryId: number;
}

export interface SendLinksInput {
  type: 'question';        // diaries later
  questionaryId: number;
  diaryId?: number;        // for future, send 0/undefined now
}