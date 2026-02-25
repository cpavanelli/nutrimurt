import type { Patient } from '../patients/types';
import type { DashboardPatientLink } from './types';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5054';

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) throw new Error(await res.text());

  if (res.status === 204) {
    return undefined as T; // no body
  }

  return res.json();
}

export const dashboardApi = {
  listRecentPatientLinks: () => request<DashboardPatientLink[]>(`${baseUrl}/api/patient-links/recent`),
  listRecentPatients: () => request<Patient[]>(`${baseUrl}/api/patients/recent`)
};
