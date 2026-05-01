import { useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  ApiError,
  createApiClient,
  requestBlob,
  type GetToken,
} from '../../lib/apiClient';
import type { MealPlan, MealPlanInput, MealPlanListItem } from './types';

export { ApiError };

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5054';

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
    list: () => request<MealPlanListItem[]>(`${baseUrl}/api/patientmealplans`),
    get: (id: number) => request<MealPlan>(`${baseUrl}/api/patientmealplans/${id}`),
    create: (payload: MealPlanInput) =>
      request<MealPlan>(`${baseUrl}/api/patientmealplans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, id: 0 }),
      }),
    update: (id: number, payload: MealPlanInput) =>
      request<void>(`${baseUrl}/api/patientmealplans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, id }),
      }),
    remove: (id: number) =>
      request<void>(`${baseUrl}/api/patientmealplans/${id}`, { method: 'DELETE' }),
    downloadPdf: async (id: number) => {
      const { blob, headers } = await requestBlob(
        getToken,
        `${baseUrl}/api/patientmealplans/${id}/pdf`
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
