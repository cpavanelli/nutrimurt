"use client";

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ApiError, createApiClient, type GetToken } from '../../lib/apiClient';
import type { Patient, PatientInput, PatientLink, PatientWithLinks, SendLinksInput } from './types';

export { ApiError };


/** The wire shape of a link row, before mapLink narrows it. */
interface RawPatientLink {
  id: number;
  patientId: number;
  urlId: string;
  questionnaryName?: string | null;
  type: number;
  questionnaryId?: number | null;
  diaryId?: number | null;
  diaryName?: string | null;
  lastAnswered?: string | null;
}

const mapLink = (link: RawPatientLink): PatientLink => ({
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
    list: () => request<Patient[]>(`/api/patients`),
    get: (id: number) => request<Patient>(`/api/patients/${id}`),
    getWithAll: (id: number) => request<PatientWithLinks>(`/api/patients/${id}?include=all`),
    create: (payload: PatientInput) =>
      request<Patient>(`/api/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: PatientInput) =>
      request<void>(`/api/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, id }),
      }),
    remove: (id: number) =>
      request<void>(`/api/patients/${id}`, { method: 'DELETE' }),
    links: async (id: number) => {
      const raw = await request<RawPatientLink[]>(`/api/patients/${id}/links`);
      return raw.map(mapLink);
    },
    sendLink: async (id: number, payload: SendLinksInput) => {
      const res = await request<RawPatientLink[]>(`/api/patients/${id}/links/send`, {
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
      request<void>(`/api/patients/${patientId}/links/${linkId}`, {
        method: 'DELETE',
      }),
  };
}

export function usePatientsApi() {
  const { getToken } = useAuth();
  return useMemo(() => createPatientsApi(getToken), [getToken]);
}
