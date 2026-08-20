import { NextResponse } from "next/server";

import { notFound, parseUrlId, withApiHandler } from "@/lib/api/handler";
import {
  buildPatientLink,
  findLinkByUrlId,
  toPublicPatientLink,
} from "@/lib/services/answers";

interface RouteContext {
  params: Promise<{ urlId: string }>;
}

/**
 * Replaces `GET /py/answer/public/{urlID}`. Unauthenticated — the `urlId` is
 * the only credential — so the payload passes through `toPublicPatientLink`,
 * which drops everything about the patient except their name.
 *
 * There is no rate limit in this handler. The Python version decorated the
 * route with slowapi at 10/s, but those counters lived in process memory and
 * Vercel invocations share none, so a literal port would have been
 * decorative. FRD §5.6 already assigns this route 10 req/s, enforced in
 * `middleware.ts` against Upstash in PR 7 — which is where a limit shared
 * across invocations can actually work.
 */
export const GET = withApiHandler(
  async (_request: Request, { params }: RouteContext) => {
    const parsed = parseUrlId((await params).urlId);
    if (!parsed.success) return parsed.response;

    const link = await findLinkByUrlId(parsed.data);
    if (!link) return notFound();

    const payload = await buildPatientLink(link);
    if (!payload) return notFound();

    return NextResponse.json(toPublicPatientLink(payload));
  },
);
