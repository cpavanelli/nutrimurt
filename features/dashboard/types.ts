import type { PatientLink } from './../answers/types';

export type DashboardPatientLink = PatientLink & {
  lastAnswered?: string | null;
  patientName: string | null;
};

export interface DashboardStats {
  activePatients: number;
  answeredQuestionnaires: number;
  recordedDiaries: number;
}

export interface RecentPatient {
  id: number;
  name: string;
  email: string;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recentPatients: RecentPatient[];
  recentlyAnsweredQuestionnaires: DashboardPatientLink[];
  recentlyAnsweredDiaries: DashboardPatientLink[];
}
