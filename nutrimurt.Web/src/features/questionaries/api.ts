import type { Questionary, QuestionaryInput } from './types';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5054';

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) throw new Error(await res.text());

  if (res.status === 204) {
    return undefined as T; // no body
  }

  return res.json();
}

export const questionariesApi = {
  list: () => request<Questionary[]>(`${baseUrl}/api/Questionnaries`),
  get: (id: number) => request<Questionary>(`${baseUrl}/api/Questionnaries/${id}`),
  create: (payload: QuestionaryInput) =>
    request<Questionary>(`${baseUrl}/api/Questionnaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: QuestionaryInput) =>
    request<void>(`${baseUrl}/api/Questionnaries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, id }),
    }),
  remove: (id: number) =>
    request<void>(`${baseUrl}/api/Questionnaries/${id}`, { method: 'DELETE' }),
};
