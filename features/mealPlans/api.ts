"use client";

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  ApiError,
  createApiClient,
  requestBlob,
  type GetToken,
} from '../../lib/apiClient';
import type { MealPlan, MealPlanInput, MealPlanListItem } from './types';

export { ApiError };


function getFilenameFromContentDisposition(value: string | null): string | null {
  if (!value) return null;

  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }

  return value.match(/filename="?([^";]+)"?/i)?.[1] ?? null;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function createMealPlansApi(getToken: GetToken) {
  const request = createApiClient(getToken);
  return {
    list: () => request<MealPlanListItem[]>(`/api/meal-plans`),
    get: (id: number) => request<MealPlan>(`/api/meal-plans/${id}`),
    create: (payload: MealPlanInput) =>
      request<MealPlan>(`/api/meal-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, id: 0 }),
      }),
    update: (id: number, payload: MealPlanInput) =>
      request<void>(`/api/meal-plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, id }),
      }),
    remove: (id: number) =>
      request<void>(`/api/meal-plans/${id}`, { method: 'DELETE' }),
    downloadPdf: async (id: number) => {
      const { blob, headers } = await requestBlob(
        getToken,
        `/api/meal-plans/${id}/pdf`
      );
      const filename =
        getFilenameFromContentDisposition(headers.get('content-disposition')) ??
        `plano-alimentar-${id}.pdf`;
      saveBlob(blob, filename);
    },
  };
}

export function useMealPlansApi() {
  const { getToken } = useAuth();
  return useMemo(() => createMealPlansApi(getToken), [getToken]);
}
