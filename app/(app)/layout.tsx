import Layout from "@/components/Layout";

/**
 * The authenticated shell. `middleware.ts` already redirects anonymous
 * requests to /sign-in, which is what `<ProtectedRoute>` used to do per route.
 *
 * `/answer/[urlId]` deliberately sits outside this group: patients reach it
 * with no session, and nothing here may call a Clerk hook that expects one.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Layout>{children}</Layout>;
}
