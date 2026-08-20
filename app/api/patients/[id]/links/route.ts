import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { formatDateTime } from "@/lib/api/date";
import { notFound, parseRouteId, withApiHandler } from "@/lib/api/handler";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  patientDiaries,
  patientLinks,
  patients,
  questionnaries,
} from "@/lib/db/schema";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Port of `PatientLinksController.GetLinks`. The DTO keeps the .NET field
 * names because `features/patients/api.ts` maps them by hand.
 *
 * `patientName` is deliberately absent: the .NET `ToDto` read
 * `link.Patient?.Name`, but `GetLinks` never included the patient, so the
 * field was always null on the wire and the SPA never reads it.
 */
export const GET = withApiHandler(
  async (_request: Request, { params }: RouteContext) => {
    const userId = await requireUserId();
    const parsedId = parseRouteId((await params).id);
    if (!parsedId.success) return parsedId.response;

    const db = getDb();
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(
        and(eq(patients.id, parsedId.data), eq(patients.userId, userId)),
      )
      .limit(1);

    if (!patient) return notFound();

    const links = await db
      .select({
        id: patientLinks.id,
        patientId: patientLinks.patientId,
        urlId: patientLinks.urlId,
        type: patientLinks.type,
        questionnaryId: patientLinks.questionnaryId,
        diaryId: patientLinks.diaryId,
        questionnaryName: questionnaries.name,
        diaryName: patientDiaries.name,
        lastAnswered: patientLinks.lastAnswered,
      })
      .from(patientLinks)
      .leftJoin(
        questionnaries,
        eq(questionnaries.id, patientLinks.questionnaryId),
      )
      .leftJoin(
        patientDiaries,
        eq(patientDiaries.id, patientLinks.diaryId),
      )
      .where(
        and(
          eq(patientLinks.patientId, parsedId.data),
          eq(patientLinks.userId, userId),
        ),
      );

    return NextResponse.json(
      links.map((link) => ({
        ...link,
        patientName: null,
        lastAnswered: formatDateTime(link.lastAnswered),
      })),
    );
  },
);
