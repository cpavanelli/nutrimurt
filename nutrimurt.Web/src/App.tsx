import { useEffect, useState } from 'react';
import { useDashboardApi } from './features/dashboard/api';
import type { DashboardResponse } from './features/dashboard/types';
import RecentPatients from './features/dashboard/RecentPatients';
import RecentlyAnswered from './features/dashboard/RecentlyAnswered';
import RecentlyAnsweredDiaries from './features/dashboard/RecentlyAnsweredDiaries';
import StatCard from './features/dashboard/StatCard';

export default function App() {
  const dashboardApi = useDashboardApi();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dashboardApi
      .get()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => console.error('Failed to load dashboard', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dashboardApi]);

  const stats = data?.stats;

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-secondary">Visão geral dos seus pacientes</p>
      </div>

      <div className="mb-7 grid gap-4 lg:grid-cols-3">
        <StatCard
          icon="users"
          label="Pacientes Ativos"
          value={stats?.activePatients ?? 0}
          iconColor="oklch(0.72 0.17 168)"
        />
        <StatCard
          icon="clipboard"
          label="Questionários Respondidos"
          value={stats?.answeredQuestionnaires ?? 0}
          iconColor="oklch(0.72 0.17 210)"
        />
        <StatCard
          icon="book"
          label="Diários Registrados"
          value={stats?.recordedDiaries ?? 0}
          iconColor="oklch(0.72 0.17 280)"
        />
      </div>

      <div className="mb-5">
        <RecentPatients patients={data?.recentPatients ?? []} loading={loading} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <RecentlyAnswered links={data?.recentlyAnsweredQuestionnaires ?? []} loading={loading} />
        <RecentlyAnsweredDiaries links={data?.recentlyAnsweredDiaries ?? []} loading={loading} />
      </div>
    </div>
  );
}
