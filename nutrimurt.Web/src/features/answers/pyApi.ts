import type { PatientLink } from './types';

const baseUrl = import.meta.env.VITE_PY_BASE_URL ?? 'http://localhost:8001';


async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) throw new Error(await res.text());

  if (res.status === 204) {
    return undefined as T; // no body
  }

  return res.json();
}

export const answersApi = {
  getQuestionaryPatientLink: (urlID: string) =>
    request<PatientLink>(`${baseUrl}/getQuestionaryPatientLink/${urlID}`),
  getDiaryPatientLink: (urlID: string) =>
    request<PatientLink>(`${baseUrl}/getDiaryPatientLink/${urlID}`),
  get: async (urlID: string) => {
    try {
      return await request<PatientLink>(`${baseUrl}/getQuestionaryPatientLink/${urlID}`);
    } catch {
      return request<PatientLink>(`${baseUrl}/getDiaryPatientLink/${urlID}`);
    }
  },
  save: (patientLink: PatientLink) =>
    request<void>(`${baseUrl}/savePatientAnswers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientLink),
    })
};
