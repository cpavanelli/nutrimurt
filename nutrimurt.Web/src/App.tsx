import { useState } from 'react'
import './App.css'
import { Link } from 'react-router-dom';

export default function App() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <Link
        to="/patients"
        className="rounded-md bg-emerald-500 px-6 py-3 text-lg font-semibold shadow hover:bg-emerald-400"
      >
        Manutenção de Pacientes
      </Link>
    </main>
  );
}