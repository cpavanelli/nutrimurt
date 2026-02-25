import type { PatientLink } from './../answers/types';

export type DashboardPatientLink = PatientLink & {
  lastAnswered?: string | null;
  patientName : string | null;
};