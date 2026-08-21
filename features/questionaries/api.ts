"use client";

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { createApiClient, type GetToken } from '../../lib/apiClient';
import type { Questionary, QuestionaryInput } from './types';


export function createQuestionariesApi(getToken: GetToken) {
  const request = createApiClient(getToken);
  return {
    list: () => request<Questionary[]>(`/api/Questionnaries`),
    get: (id: number) => request<Questionary>(`/api/Questionnaries/${id}`),
    create: (payload: QuestionaryInput) =>
      request<Questionary>(`/api/Questionnaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: QuestionaryInput) =>
      request<void>(`/api/Questionnaries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, id }),
      }),
    remove: (id: number) =>
      request<void>(`/api/Questionnaries/${id}`, { method: 'DELETE' }),
  };
}

export function useQuestionariesApi() {
  const { getToken } = useAuth();
  return useMemo(() => createQuestionariesApi(getToken), [getToken]);
}
