import { useAuth } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const { isSignedIn } = useAuth();

  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-6 py-6 text-center text-sm text-slate-400">
      {isSignedIn && (
        <nav className="mb-3 flex justify-center gap-6">
          <Link to="/" className="transition hover:text-emerald-400">Dashboard</Link>
          <Link to="/patients" className="transition hover:text-emerald-400">Pacientes</Link>
          <Link to="/questionaries" className="transition hover:text-emerald-400">Questionários</Link>
        </nav>
      )}
      <p>&copy; 2026 NutriMurt. All rights reserved.</p>
    </footer>
  );
}
