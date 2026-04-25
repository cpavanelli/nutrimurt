import { SignIn } from '@clerk/clerk-react';

export default function SignInPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Nutrimurt</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Área Restrita</h1>
        </div>
        <SignIn routing="hash" />
      </div>
    </div>
  );
}
