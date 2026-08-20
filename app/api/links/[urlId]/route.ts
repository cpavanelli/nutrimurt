import { NextResponse } from "next/server";

import { notFound, parseUrlId, withApiHandler } from "@/lib/api/handler";
import { requireUserId } from "@/lib/auth";
import {
  buildPatientLink,
  findLinkByUrlId,
  linkBelongsTo,
} from "@/lib/services/answers";

interface RouteContext {
  params: Promise<{ urlId: string }>;
}

/**
 * Replaces `GET /py/answer/staff/{urlID}`. Full payload, patient email
 * included, scoped to the owning user.
 */
export const GET = withApiHandler(
  async (_request: Request, { params }: RouteContext) => {
    const userId = await requireUserId();
    const parsed = parseUrlId((await params).urlId);
    if (!parsed.success) return parsed.response;

    const link = await findLinkByUrlId(parsed.data);
    if (!link || !linkBelongsTo(link, userId)) return notFound();

    const payload = await buildPatientLink(link);
    if (!payload) return notFound();

    return NextResponse.json(payload);
  },
);
