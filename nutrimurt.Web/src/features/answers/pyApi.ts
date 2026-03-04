import type { PatientLink } from './types';

const rawBaseUrl = import.meta.env.VITE_PY_BASE_URL ?? '/py';
const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '');
const baseUrl =
  normalizedBaseUrl === ''
    ? '/py'
    : normalizedBaseUrl.endsWith('/py')
      ? normalizedBaseUrl
      : `${normalizedBaseUrl}/py`;


async function request<T>(input: RequestInfo, init?: RequestInit, token?: string | null): Promise<T> {
  const headers: HeadersInit = {
    ...(init?.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(input, { ...init, headers });
  if (!res.ok) throw new Error(await res.text());

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export const answersApi = {
  /** Public patient-facing fetch — no auth required, returns minimal PII. */
  getPatientLink: (urlID: string) =>
    request<PatientLink>(`${baseUrl}/answer/public/${urlID}`),
  /** Staff-only fetch — requires Clerk auth token. */
  getPatientLinkStaff: (urlID: string, token?: string | null) =>
    request<PatientLink>(`${baseUrl}/answer/staff/${urlID}`, undefined, token),
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
