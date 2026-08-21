import { auth } from "@clerk/nextjs/server";

/**
 * Thrown when a route handler runs without an authenticated Clerk session.
 *
 * In practice `middleware.ts` rejects unauthenticated requests to non-public
 * `/api/*` routes before any handler runs, so this is defense in depth. It
 * still matters: a route that slips out of the middleware matcher would
 * otherwise read `userId` as null and fall through to unscoped queries.
 */
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * Replaces both `ClaimsPrincipalExtensions.GetUserId()` from the .NET API and
 * `get_user_id()` from the Python service. Returns the Clerk `sub` claim,
 * which is what every `user_id` column is scoped by.
 */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new UnauthorizedError();
  }

  return userId;
}
