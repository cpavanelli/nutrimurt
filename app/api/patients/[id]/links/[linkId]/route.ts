import { and, eq } from "drizzle-orm";

import { notFound, parseRouteId, withApiHandler } from "@/lib/api/handler";
import { requireUserId } from "@/lib/auth";
import { getDb, withTransaction } from "@/lib/db";
import {
  patientDiaries,
  patientDiaryEntries,
  patientLinks,
} from "@/lib/db/schema";

interface RouteContext {
  params: Promise<{ id: string; linkId: string }>;
}

/**
 * Port of `PatientLinksController.DeleteLink`.
 *
 * `patient_question_answers` and `patient_question_answer_alternatives`
 * cascade from `patient_links`, so the explicit deletes the .NET version did
 * are redundant here. The diary does not cascade — `patient_links.diary_id`
 * has `ON DELETE no action` — so its entries and the diary row are removed by
 * hand, in that order, before the link goes.
 */
export const DELETE = withApiHandler(
  async (_request: Request, { params }: RouteContext) => {
    const userId = await requireUserId();
    const routeParams = await params;

    const parsedPatientId = parseRouteId(routeParams.id);
    if (!parsedPatientId.success) return parsedPatientId.response;

    const parsedLinkId = parseRouteId(routeParams.linkId);
    if (!parsedLinkId.success) return parsedLinkId.response;

    const [link] = await getDb()
      .select({ id: patientLinks.id, diaryId: patientLinks.diaryId })
      .from(patientLinks)
      .where(
        and(
          eq(patientLinks.id, parsedLinkId.data),
          eq(patientLinks.patientId, parsedPatientId.data),
          eq(patientLinks.userId, userId),
        ),
      )
      .limit(1);

    if (!link) return notFound();

    await withTransaction(async (tx) => {
      await tx.delete(patientLinks).where(eq(patientLinks.id, link.id));

      if (link.diaryId !== null) {
        await tx
          .delete(patientDiaryEntries)
          .where(eq(patientDiaryEntries.patientDiaryId, link.diaryId));
        await tx
          .delete(patientDiaries)
          .where(eq(patientDiaries.id, link.diaryId));
      }
    });

    return new Response(null, { status: 204 });
  },
);
