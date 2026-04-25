import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { UserButton } from '@clerk/clerk-react';

export default function Header() {
  const { isSignedIn } = useAuth();

  return (
    <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" className="text-sm uppercase tracking-[0.3em] text-emerald-300">
          Nutrimurt
        </Link>
        {isSignedIn && (
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-3">
              <Link
                to="/"
                className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-400"
              >
                Dashboard
              </Link>
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
            </nav>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        )}
      </div>
    </header>
  );
}
