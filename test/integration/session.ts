/**
 * Stands in for the Clerk session during integration tests.
 *
 * `setup.ts` mocks `@clerk/nextjs/server` to read from here, so a test can
 * switch users between requests and exercise the per-user row scoping that
 * every route depends on.
 */
let currentUserId: string | null = null;

export const USER_A = "user_integration_a";
export const USER_B = "user_integration_b";

export function signInAs(userId: string | null) {
  currentUserId = userId;
}

export function currentSessionUserId() {
  return currentUserId;
}
