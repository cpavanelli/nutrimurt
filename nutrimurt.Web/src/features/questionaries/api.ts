import { useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { createApiClient, type GetToken } from '../../lib/apiClient';
import type { Questionary, QuestionaryInput } from './types';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5054';

export function createQuestionariesApi(getToken: GetToken) {
  const request = createApiClient(getToken);
  return {
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
}

export function useQuestionariesApi() {
  const { getToken } = useAuth();
  return useMemo(() => createQuestionariesApi(getToken), [getToken]);
}
