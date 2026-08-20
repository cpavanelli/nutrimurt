import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  conflict,
  parseJson,
  withApiHandler,
} from "@/lib/api/handler";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { guardrails } from "@/lib/guardrails";
import { patientInputSchema } from "@/lib/validation/schemas";

const patientFields = {
  id: patients.id,
  name: patients.name,
  email: patients.email,
  phone: patients.phone,
  cpf: patients.cpf,
  createdAt: patients.createdAt,
  birth: patients.birth,
  weight: patients.weight,
  height: patients.height,
};

export const GET = withApiHandler(async () => {
  const userId = await requireUserId();
  const result = await getDb()
    .select(patientFields)
    .from(patients)
    .where(eq(patients.userId, userId));

  return NextResponse.json(result);
});

export const POST = withApiHandler(async (request: Request) => {
  const userId = await requireUserId();
  const parsed = await parseJson(request, patientInputSchema);
  if (!parsed.success) return parsed.response;

  const db = getDb();
  const [{ value: patientCount }] = await db
    .select({ value: count() })
    .from(patients)
    .where(eq(patients.userId, userId));

  if (patientCount >= guardrails.maxPatients) {
    return conflict("Você atingiu o número máximo de pacientes.");
  }

  const [created] = await db
    .insert(patients)
    .values({
      ...parsed.data,
      birth: parsed.data.birth ?? null,
      userId,
      createdAt: new Date(),
    })
    .returning(patientFields);

  return NextResponse.json(created, {
    status: 201,
    headers: { Location: `/api/patients/${created.id}` },
  });
});
