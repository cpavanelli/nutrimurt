import { NextResponse } from "next/server";

import {
  conflict,
  notFound,
  parseJson,
  parseUrlId,
  withApiHandler,
} from "@/lib/api/handler";
import { findLinkByUrlId, savePatientDiary } from "@/lib/services/answers";
import { patientDiarySchema } from "@/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ urlId: string }>;
}

/**
 * Replaces `POST /py/savePatientDiary`. Same R9 change as the answers route:
 * the target comes from the path, never from the body. The old code trusted
 * `diary_id` from the payload, which let one patient overwrite another
 * patient's diary.
 */
export const POST = withApiHandler(
  async (request: Request, { params }: RouteContext) => {
    const parsedUrlId = parseUrlId((await params).urlId);
    if (!parsedUrlId.success) return parsedUrlId.response;

    const parsed = await parseJson(request, patientDiarySchema);
    if (!parsed.success) return parsed.response;

    const link = await findLinkByUrlId(parsedUrlId.data);
    if (!link) return notFound();

    if (link.type !== 2) {
      return NextResponse.json(
        { detail: "Este link não é um diário." },
        { status: 422 },
      );
    }

    const result = await savePatientDiary(link, parsed.data.entries);
    if (!result.ok) return conflict(result.detail);

    return NextResponse.json({ status: "ok" });
  },
);
