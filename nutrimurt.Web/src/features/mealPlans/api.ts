import { useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ApiError, createApiClient, type GetToken } from '../../lib/apiClient';
import type { MealPlan, MealPlanInput, MealPlanListItem } from './types';

export { ApiError };

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5054';

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
  };
}

export function useMealPlansApi() {
  const { getToken } = useAuth();
  return useMemo(() => createMealPlansApi(getToken), [getToken]);
}
