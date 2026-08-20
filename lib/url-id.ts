import { randomBytes } from "node:crypto";

/**
 * Patient links are addressed by an unguessable `urlId` rather than by their
 * primary key, because patients reach them unauthenticated. The value is the
 * only secret protecting a link, so it must stay 16 random bytes rendered as
 * 32 lowercase hex characters — both to match `PatientLinksController`'s
 * `Convert.ToHexString(...).ToLower()` and to fill the `CHAR(32)` column
 * exactly. A shorter value would be space-padded by Postgres and would no
 * longer compare equal.
 */
export function generateUrlId(): string {
  return randomBytes(16).toString("hex");
}

export const URL_ID_PATTERN = /^[0-9a-f]{32}$/;
