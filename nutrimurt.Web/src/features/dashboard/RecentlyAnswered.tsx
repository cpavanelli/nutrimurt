import { useEffect, useState } from 'react';
import { dashboardApi } from './api';
import type { DashboardPatientLink } from './types';
import { Link } from 'react-router-dom';


export default function RecentlyAnswered() {
  const [patientLinks, setPatientLinks] = useState<DashboardPatientLink[]>([]);



  async function load() {
    try {
      //   setLoading(true);
      const data = await dashboardApi.listRecentPatientLinks();
      setPatientLinks(data);
    } catch (err) {
      //setError(err instanceof Error ? err.message : 'Failed to load');
      console.log('Failed to load listRecentPatientLinks');
    }
    // finally {
    //   setLoading(false);
    // }
  }

  useEffect(() => {
    load();
  }, []);

  return (


    <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-slate-900/60 to-slate-950 p-6 shadow-2xl ">
      <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-300 ">
        <span>Questionários respondidos</span>
      </div>
      <div className="max-w-3xl mx-auto shadow-md rounded-xl p-6 border-white/10 bg-slate-900/60 p-4 shadow">


        <div className="grid grid-cols-4 font-semibold border-b pb-2 ">
          <span>Nome</span>
          <span>Questionário</span>
          <span>Data</span>
          <span></span>
        </div>

        {patientLinks.map((u) => (
          <div key={u.id} className="grid grid-cols-4 items-center py-3 border-b bg-slate-900/60 p-4 shadow">
            <span>{u.patientName}</span>
            <span>{u.questionnaryName}</span>
            <span>{u.lastAnswered}</span>
            <span>
              <Link
                to={`/patientAnswer/${u.urlId}`}
                className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-400"
              >Ver</Link>

            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
