import { Link } from 'react-router-dom';

export default function MaintenanceHeader() {
    return (


        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Nutrimurt</p>
            <h1 className="text-2xl font-semibold text-white"></h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="#features"
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:border-emerald-300/60 hover:text-white"
            >
              Administração
            </a>
            <Link
              to="/patients"
              className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-400"
            >
              Pacientes
            </Link>
            <Link
              to="/questionaries"
              className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-400"
            >
              Questionários
            </Link>
          </div>
        </header>
    );
}
