import { NextResponse } from "next/server";

import {
  conflict,
  notFound,
  parseJson,
  parseUrlId,
  withApiHandler,
} from "@/lib/api/handler";
import { findLinkByUrlId, savePatientAnswers } from "@/lib/services/answers";
import { patientAnswersSchema } from "@/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ urlId: string }>;
}

/**
 * Replaces `POST /py/savePatientAnswers`.
 *
 * Breaking change (R9): the `urlId` moved from the JSON body into the path,
 * and the body no longer carries a link id at all. The old shape let a caller
 * present one valid `urlId` while naming a different link to write into.
 */
export const POST = withApiHandler(
  async (request: Request, { params }: RouteContext) => {
    const parsedUrlId = parseUrlId((await params).urlId);
    if (!parsedUrlId.success) return parsedUrlId.response;

    const parsed = await parseJson(request, patientAnswersSchema);
    if (!parsed.success) return parsed.response;

    const link = await findLinkByUrlId(parsedUrlId.data);
    if (!link) return notFound();

    if (link.type !== 1) {
      return NextResponse.json(
        { detail: "Este link não é um questionário." },
        { status: 422 },
      );
    }

    const result = await savePatientAnswers(link, parsed.data.questions);
    if (!result.ok) return conflict(result.detail);

    return NextResponse.json({ status: "ok" });
  },
);
