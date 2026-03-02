import type { PatientLink } from './types';

const rawBaseUrl = import.meta.env.VITE_PY_BASE_URL ?? '/py';
const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '');
const baseUrl =
  normalizedBaseUrl === ''
    ? '/py'
    : normalizedBaseUrl.endsWith('/py')
      ? normalizedBaseUrl
      : `${normalizedBaseUrl}/py`;


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
  /** Public patient-facing fetch — no auth required, returns minimal PII. */
  get: (urlID: string) =>
    request<PatientLink>(`${baseUrl}/answer/public/${urlID}`),
  /** Staff-only fetch — will require auth token once Phase 1 Step 5 is complete. */
  getStaff: (urlID: string) =>
    request<PatientLink>(`${baseUrl}/answer/staff/${urlID}`),
  save: (patientLink: PatientLink) =>
    request<void>(`${baseUrl}/savePatientAnswers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientLink),
    }),
    savePatientDiary: (patientLink: PatientLink) =>
    request<void>(`${baseUrl}/savePatientDiary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientLink),
    })
};
