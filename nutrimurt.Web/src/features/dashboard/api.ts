import { useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { createApiClient, type GetToken } from '../../lib/apiClient';
import type { Patient } from '../patients/types';
import type { DashboardPatientLink } from './types';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5054';

export function createDashboardApi(getToken: GetToken) {
  const request = createApiClient(getToken);
  return {
    listRecentPatientLinks: () => request<DashboardPatientLink[]>(`${baseUrl}/api/patient-links/recent`),
    listRecentPatients: () => request<Patient[]>(`${baseUrl}/api/patients/recent`),
  };
}

export function useDashboardApi() {
  const { getToken } = useAuth();
  return useMemo(() => createDashboardApi(getToken), [getToken]);
}
