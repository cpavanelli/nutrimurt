"use client";

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { createApiClient, type GetToken } from '../../lib/apiClient';
import type { Questionary, QuestionaryInput } from './types';


export function createQuestionariesApi(getToken: GetToken) {
  const request = createApiClient(getToken);
  return {
    list: () => request<Questionary[]>(`/api/questionnaires`),
    get: (id: number) => request<Questionary>(`/api/questionnaires/${id}`),
    create: (payload: QuestionaryInput) =>
      request<Questionary>(`/api/questionnaires`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: QuestionaryInput) =>
      request<void>(`/api/questionnaires/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, id }),
      }),
    remove: (id: number) =>
      request<void>(`/api/questionnaires/${id}`, { method: 'DELETE' }),
  };
}

export function useQuestionariesApi() {
  const { getToken } = useAuth();
  return useMemo(() => createQuestionariesApi(getToken), [getToken]);
}
