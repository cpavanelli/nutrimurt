import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { formatDateTime } from "@/lib/api/date";
import {
  conflict,
  notFound,
  parseJson,
  parseRouteId,
  withApiHandler,
} from "@/lib/api/handler";
import { requireUserId } from "@/lib/auth";
import { getDb, withTransaction } from "@/lib/db";
import {
  patientDiaries,
  patientLinks,
  patients,
  questionnaries,
} from "@/lib/db/schema";
import { guardrails } from "@/lib/guardrails";
import { generateUrlId } from "@/lib/url-id";
import { sendPatientLinkSchema } from "@/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Port of `PatientLinksController.SendLink`. Despite the name it sends no
 * email — it creates the link. Mailing is a separate call to
 * `POST /api/links/{urlId}/send`, matching the old split between the .NET API
 * and the Python service.
 *
 * Returns an array holding the single created link, which is the shape the
 * .NET action returned and the SPA maps over.
 */
export const POST = withApiHandler(
  async (request: Request, { params }: RouteContext) => {
    const userId = await requireUserId();
    const parsedId = parseRouteId((await params).id);
    if (!parsedId.success) return parsedId.response;

    const parsed = await parseJson(request, sendPatientLinkSchema);
    if (!parsed.success) return parsed.response;

    const db = getDb();
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(
        and(eq(patients.id, parsedId.data), eq(patients.userId, userId)),
      )
      .limit(1);

    if (!patient) return notFound();

    const [{ value: linkCount }] = await db
      .select({ value: count() })
      .from(patientLinks)
      .where(
        and(
          eq(patientLinks.patientId, parsedId.data),
          eq(patientLinks.userId, userId),
        ),
      );

    if (linkCount >= guardrails.maxLinksPerPatient) {
      return conflict(
        "Você atingiu o número máximo de links para este paciente.",
      );
    }

    const { type, questionnaryId, diaryName } = parsed.data;

    // The .NET version inserted the diary, saved, then inserted the link.
    // A failure between the two orphaned a diary row, so both go in one
    // transaction here.
    const created = await withTransaction(async (tx) => {
      let diaryId: number | null = null;

      if (type === 2) {
        const [diary] = await tx
          .insert(patientDiaries)
          .values({ name: diaryName as string })
          .returning({ id: patientDiaries.id });
        diaryId = diary.id;
      }

      const [link] = await tx
        .insert(patientLinks)
        .values({
          userId,
          patientId: parsedId.data,
          urlId: generateUrlId(),
          type,
          questionnaryId: type === 1 ? (questionnaryId as number) : null,
          diaryId: type === 2 ? diaryId : null,
        })
        .returning({
          id: patientLinks.id,
          patientId: patientLinks.patientId,
          urlId: patientLinks.urlId,
          type: patientLinks.type,
          questionnaryId: patientLinks.questionnaryId,
          diaryId: patientLinks.diaryId,
          lastAnswered: patientLinks.lastAnswered,
        });

      return link;
    });

    const [questionnaryName] = created.questionnaryId
      ? await db
          .select({ name: questionnaries.name })
          .from(questionnaries)
          .where(eq(questionnaries.id, created.questionnaryId))
      : [];

    return NextResponse.json([
      {
        ...created,
        questionnaryName: questionnaryName?.name ?? null,
        diaryName: type === 2 ? (diaryName as string) : null,
        patientName: null,
        lastAnswered: formatDateTime(created.lastAnswered),
      },
    ]);
  },
);
