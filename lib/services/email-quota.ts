import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { userEmailSendCounters } from "@/lib/db/schema";
import { guardrails } from "@/lib/guardrails";

/**
 * The window is a UTC calendar day, matching
 * `datetime.now(timezone.utc).date()` in `reserve_email_send_slot`. The user
 * facing message names UTC explicitly, so this is parity rather than a
 * display choice.
 */
function utcWindowDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Claims one of the caller's daily email sends, returning `false` when the cap
 * is already spent.
 *
 * R4. The Python original read the counter, decided, then wrote — safe only
 * because a single process served every request. Vercel runs concurrent
 * invocations that share no memory, so a read-then-write here would let two
 * requests both observe 9 and both send.
 *
 * This is therefore one statement. `ON CONFLICT DO UPDATE` takes a row lock,
 * and the `WHERE` clause decides inside that lock: the update applies only
 * when the window has rolled over or the count is still under the cap.
 * Postgres returns no row when the `WHERE` fails, which is how the caller
 * learns the quota is exhausted — the counter is never inflated past the cap.
 *
 * Never rewrite this as a select followed by an update.
 */
export async function reserveEmailSendSlot(
  userId: string,
  now: Date = new Date(),
): Promise<boolean> {
  const windowDate = utcWindowDate(now);

  const reserved = await getDb()
    .insert(userEmailSendCounters)
    .values({
      userId,
      windowDate,
      sendCount: 1,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userEmailSendCounters.userId,
      set: {
        windowDate: sql`excluded.window_date`,
        sendCount: sql`case
          when ${userEmailSendCounters.windowDate} <> excluded.window_date then 1
          else ${userEmailSendCounters.sendCount} + 1
        end`,
        updatedAt: sql`excluded.updated_at`,
      },
      setWhere: sql`${userEmailSendCounters.windowDate} <> excluded.window_date
        or ${userEmailSendCounters.sendCount} < ${guardrails.maxEmailSendsPerDay}`,
    })
    .returning({ sendCount: userEmailSendCounters.sendCount });

  return reserved.length > 0;
}

export const emailQuotaMessage = `Você atingiu o limite diário de ${guardrails.maxEmailSendsPerDay} e-mails por dia UTC.`;
