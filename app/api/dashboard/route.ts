import { and, count, desc, eq, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { formatDateTime } from "@/lib/api/date";
import { withApiHandler } from "@/lib/api/handler";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  patientDiaries,
  patientLinks,
  patients,
  questionnaries,
} from "@/lib/db/schema";

const recentLimit = 5;

async function answeredCount(userId: string, type: 1 | 2) {
  const [{ value }] = await getDb()
    .select({ value: count() })
    .from(patientLinks)
    .where(
      and(
        eq(patientLinks.userId, userId),
        eq(patientLinks.type, type),
        isNotNull(patientLinks.lastAnswered),
      ),
    );
  return value;
}

async function recentLinks(userId: string, type: 1 | 2) {
  const rows = await getDb()
    .select({
      id: patientLinks.id,
      patientId: patientLinks.patientId,
      urlId: patientLinks.urlId,
      type: patientLinks.type,
      questionnaryId: patientLinks.questionnaryId,
      diaryId: patientLinks.diaryId,
      questionnaryName: questionnaries.name,
      diaryName: patientDiaries.name,
      patientName: patients.name,
      lastAnswered: patientLinks.lastAnswered,
    })
    .from(patientLinks)
    .innerJoin(
      patients,
      and(
        eq(patientLinks.patientId, patients.id),
        eq(patients.userId, userId),
      ),
    )
    .leftJoin(
      questionnaries,
      and(
        eq(patientLinks.questionnaryId, questionnaries.id),
        eq(questionnaries.userId, userId),
      ),
    )
    .leftJoin(patientDiaries, eq(patientLinks.diaryId, patientDiaries.id))
    .where(
      and(
        eq(patientLinks.userId, userId),
        eq(patientLinks.type, type),
        isNotNull(patientLinks.lastAnswered),
      ),
    )
    .orderBy(desc(patientLinks.lastAnswered))
    .limit(recentLimit);

  return rows.map((row) => ({
    ...row,
    lastAnswered: formatDateTime(row.lastAnswered),
  }));
}

export const GET = withApiHandler(async () => {
  const userId = await requireUserId();
  const db = getDb();

  const [activePatientResult, answeredQuestionnaires, recordedDiaries] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(patients)
        .where(eq(patients.userId, userId)),
      answeredCount(userId, 1),
      answeredCount(userId, 2),
    ]);

  const [recentPatients, recentlyAnsweredQuestionnaires, recentlyAnsweredDiaries] =
    await Promise.all([
      db
        .select({ id: patients.id, name: patients.name, email: patients.email })
        .from(patients)
        .where(eq(patients.userId, userId))
        .orderBy(desc(patients.createdAt))
        .limit(recentLimit),
      recentLinks(userId, 1),
      recentLinks(userId, 2),
    ]);

  return NextResponse.json({
    stats: {
      activePatients: activePatientResult[0].value,
      answeredQuestionnaires,
      recordedDiaries,
    },
    recentPatients,
    recentlyAnsweredQuestionnaires,
    recentlyAnsweredDiaries,
  });
});
