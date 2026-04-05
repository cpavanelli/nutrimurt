import { useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ApiError, createApiClient, type GetToken } from '../../lib/apiClient';
import type { Patient, PatientInput, PatientLink, PatientWithLinks, SendLinksInput } from './types';

export { ApiError };

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5054';

const mapLink = (link: any): PatientLink => ({
  id: link.id,
  patientId: link.patientId,
  urlId: link.urlId,
  questionnaryName: link.questionnaryName ?? '',
  type: link.type === 2 ? 'diary' : 'question',
  questionnaryId: link.questionnaryId ?? 0,
  diaryId: link.diaryId ?? 0,
  diaryName: link.diaryName ?? null,
  lastAnswered: link.lastAnswered ?? null,
});

export function createPatientsApi(getToken: GetToken) {
  const request = createApiClient(getToken);
  return {
    list: () => request<Patient[]>(`${baseUrl}/api/patients`),
    get: (id: number) => request<Patient>(`${baseUrl}/api/patients/${id}`),
    getWithAll: (id: number) => request<PatientWithLinks>(`${baseUrl}/api/patients/getWithAll/${id}`),
    create: (payload: PatientInput) =>
      request<Patient>(`${baseUrl}/api/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: PatientInput) =>
      request<void>(`${baseUrl}/api/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, id }),
      }),
    remove: (id: number) =>
      request<void>(`${baseUrl}/api/patients/${id}`, { method: 'DELETE' }),
    links: async (id: number) => {
      const raw = await request<any[]>(`${baseUrl}/api/patients/${id}/links`);
      return raw.map(mapLink);
    },
    sendLink: async (id: number, payload: SendLinksInput) => {
      const res = await request<any[]>(`${baseUrl}/api/patients/${id}/links/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: payload.type === 'diary' ? 2 : 1,
          questionnaryId: payload.questionaryId,
          diaryName: payload.diaryName,
        }),
      });
      return res.map(mapLink);
    },
    deleteLink: (patientId: number, linkId: number) =>
      request<void>(`${baseUrl}/api/patients/${patientId}/links/${linkId}`, {
        method: 'DELETE',
      }),
  };
}

export function usePatientsApi() {
  const { getToken } = useAuth();
  return useMemo(() => createPatientsApi(getToken), [getToken]);
}
