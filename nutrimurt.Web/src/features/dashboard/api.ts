import { useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { createApiClient, type GetToken } from '../../lib/apiClient';
import type { DashboardResponse } from './types';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5054';

export function createDashboardApi(getToken: GetToken) {
  const request = createApiClient(getToken);
  return {
    get: () => request<DashboardResponse>(`${baseUrl}/api/dashboard`),
  };
}

export function useDashboardApi() {
  const { getToken } = useAuth();
  return useMemo(() => createDashboardApi(getToken), [getToken]);
}
