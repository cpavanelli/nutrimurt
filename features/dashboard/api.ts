"use client";

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { createApiClient, type GetToken } from '../../lib/apiClient';
import type { DashboardResponse } from './types';


export function createDashboardApi(getToken: GetToken) {
  const request = createApiClient(getToken);
  return {
    get: () => request<DashboardResponse>(`/api/dashboard`),
  };
}

export function useDashboardApi() {
  const { getToken } = useAuth();
  return useMemo(() => createDashboardApi(getToken), [getToken]);
}
