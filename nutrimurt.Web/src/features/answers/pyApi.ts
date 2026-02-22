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
  get: (urlID: string) => request<PatientLink>(`${baseUrl}/getPatientLink/${urlID}`),
  save: (patientLink: PatientLink) =>
    request<void>(`${baseUrl}/savePatientAnswers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientLink),
    })
};
