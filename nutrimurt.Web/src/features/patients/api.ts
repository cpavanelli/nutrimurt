import type { Patient, PatientInput, PatientLink, PatientWithLinks, SendLinksInput } from './types';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5054';

// add a type
export class ApiError extends Error {
  public status: number;
  public validation?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    validation?: Record<string, string[]>
  ) {
    super(message);
    this.status = status;
    this.validation = validation;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);

  if (!res.ok) {
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/problem+json') || contentType.includes('application/json')) {
      const problem = await res.json();
      const validation = problem.errors as Record<string, string[]> | undefined;
      const message =
        validation ? Object.values(validation).flat().join(' ') :
          problem.detail ?? problem.title ?? res.statusText;
      console.log(message);
      throw new ApiError(message, res.status, validation);
    }
    throw new ApiError(await res.text(), res.status);
  }

  if (res.status === 204) {
    return undefined as T; // no body
  }

  return res.json();
}

export const patientsApi = {
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
};

const mapLink = (link: any): PatientLink => ({
  id: link.id,
  patientId: link.patientId,
  urlId: link.urlId,
  questionnaryName: link.questionnaryName ?? '',
  type: link.type === 2 ? 'diary' : 'question',
  questionnaryId: link.questionnaryId,
  diaryId: link.diaryId ?? ''
});
