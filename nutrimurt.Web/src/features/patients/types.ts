export interface Patient {
  id: number;
  name: string;
  email: string;
  phone: string;
  birth?: string | null;
  weight: number;
  height: number;
  createdAt: string;
}

export type PatientInput = Omit<Patient, 'id' | 'createdAt'>;
