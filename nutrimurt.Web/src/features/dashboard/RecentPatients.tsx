import { useEffect, useState } from 'react';
import { useDashboardApi } from './api';
import { Link } from 'react-router-dom';
import type { Patient } from '../patients/types';
import Spinner from '../../components/Spinner';


export default function RecentlyAnswered() {
  const dashboardApi = useDashboardApi();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);



  async function load() {
    try {
      setLoading(true);
      const data = await dashboardApi.listRecentPatients();
      setPatients(data);
    } catch (err) {
      console.log('Failed to load listRecentPatients');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (


    <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-slate-900/60 to-slate-950 p-6 shadow-2xl">
      <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-300">
        <span>Pacientes recentes</span>
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {patients.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-4 shadow"
            >
              <div className="text-lg font-semibold text-white">{p.name}</div>
              <div className="min-w-0 break-all text-sm text-slate-300">{p.email}</div>
              <span>
                <Link
                  to={`/patientSummary/${p.id}`}
                  className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-400"
                >Ver</Link>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
