import './App.css'
import RecentlyAnswered from '../src/features/dashboard/RecentlyAnswered';
import TopHeader from './components/TopHeader';
import RecentPatients from './features/dashboard/RecentPatients';

export default function App() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900 via-slate-950 to-black"></div>
      <div className="absolute left-1/2 top-10 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-teal-800/20 blur-3xl" />
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 pb-16 pt-10 lg:px-10">
        <TopHeader />
        <section className="grid flex-1 gap-6 py-8 lg:grid-cols-2 ">
          <RecentPatients />
          <RecentlyAnswered />
        </section>
        <section className="grid flex-1 gap-6 py-8 lg:grid-cols-2 ">
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-slate-900/60 to-slate-950 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-300">
              <span>Pacientes recentes</span>
            </div>
            <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-300">
            </div>
          </div>
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-slate-900/60 to-slate-950 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-300">
              <span>Pacientes com resposta</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}