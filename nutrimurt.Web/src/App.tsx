import { useState } from 'react'
import './App.css'
import { Link } from 'react-router-dom';

const patients = [
  { id: 1, name: 'Ana Silva', email: 'ana@example.com' },
  { id: 2, name: 'João Costa', email: 'joao@example.com' },
  { id: 3, name: 'Maria Souza', email: 'maria@example.com' },
  { id: 1, name: 'Ana Silva', email: 'ana@example.com' },
  { id: 2, name: 'João Costa', email: 'joao@example.com' },
  { id: 3, name: 'Maria Souza', email: 'maria@example.com' },
];

export default function App() {
  return (

    <main className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900 via-slate-950 to-black"></div>
      <div className="absolute left-1/2 top-10 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-teal-800/20 blur-3xl" />
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 pb-16 pt-10 lg:px-10">
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
        <section className="grid flex-1 gap-6 py-8 lg:grid-cols-2 ">
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-slate-900/60 to-slate-950 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-300">
              <span>Pacientes recentes</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {patients.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-4 shadow"
                >
                  <div className="text-lg font-semibold text-white">{p.name}</div>
                  <div className="text-sm text-slate-300">{p.email}</div>
                  <button className="self-start rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-400">
                    Send
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-slate-900/60 to-slate-950 p-6 shadow-2xl ">
            <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-300 ">
              <span>Pacientes com resposta</span>
            </div>
             <div className="max-w-3xl mx-auto shadow-md rounded-xl p-6 border-white/10 bg-slate-900/60 p-4 shadow">


            <div className="grid grid-cols-3 font-semibold border-b pb-2 ">
              <span>Name</span>
              <span>Email</span>
              <span></span>
            </div>

                {patients.map((u) => (
                  <div key={u.id} className="grid grid-cols-3 items-center py-3 border-b bg-slate-900/60 p-4 shadow">
                    <span>{u.name}</span>
                    <span>{u.email}</span>
                    <button
                      className="self-start rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-400"
                      onClick={() => console.log("Send to", u.email)}
                    >
                      Send
                    </button>
                  </div>
                ))}
           </div>
          </div>

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


    // <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
    //   <div>
    //     <Link
    //       to="/patients"
    //       className="rounded-md bg-emerald-500 px-6 py-3 text-lg font-semibold shadow hover:bg-emerald-400"
    //     >
    //       Pacientes
    //     </Link>
    //   </div>
    //   <div>
    //     <Link
    //       to="/questionaries"
    //       className="rounded-md bg-emerald-500 px-6 py-3 text-lg font-semibold shadow hover:bg-emerald-400"
    //     >
    //       Questionarios
    //     </Link>
    //   </div>
    // </main>
  );
}