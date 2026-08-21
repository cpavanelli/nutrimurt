import { SignIn } from "@clerk/nextjs";

/**
 * Keeps the SPA's branding. It used to render inside the authenticated
 * `<Layout>`, so it sat next to a sidebar that was empty for a signed-out
 * visitor; standing alone here it needs its own full-height background.
 *
 * `routing="path"` rather than the SPA's `"hash"`, because the catch-all
 * segment gives Clerk real sub-paths to use.
 */
export default function Page() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-surface-base p-6">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">
            Nutrimurt
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            Área Restrita
          </h1>
        </div>
        <SignIn path="/sign-in" routing="path" />
      </div>
    </div>
  );
}
