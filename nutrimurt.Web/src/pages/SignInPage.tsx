import { SignIn } from '@clerk/clerk-react';

export default function SignInPage() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900 via-slate-950 to-black" />
      <div className="absolute left-1/2 top-10 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-teal-800/20 blur-3xl" />
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Nutrimurt</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Área Restrita</h1>
        </div>
        <SignIn routing="hash" />
      </div>
    </main>
  );
}
