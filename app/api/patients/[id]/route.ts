import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { formatDateTime } from "@/lib/api/date";
import {
  notFound,
  parseJson,
  parseRouteId,
  validationResponse,
  withApiHandler,
} from "@/lib/api/handler";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  patientDiaries,
  patientLinks,
  patients,
  questionnaries,
} from "@/lib/db/schema";
import {
  patientIncludeSchema,
  patientUpdateSchema,
} from "@/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ id: string }>;
}

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

export const GET = withApiHandler(
  async (request: Request, { params }: RouteContext) => {
    const userId = await requireUserId();
    const parsedId = parseRouteId((await params).id);
    if (!parsedId.success) return parsedId.response;

    const url = new URL(request.url);
    const parsedQuery = patientIncludeSchema.safeParse({
      include: url.searchParams.get("include") ?? undefined,
    });
    if (!parsedQuery.success) return validationResponse(parsedQuery.error);

    const db = getDb();
    const [patient] = await db
      .select(patientFields)
      .from(patients)
      .where(
        and(eq(patients.id, parsedId.data), eq(patients.userId, userId)),
      )
      .limit(1);

    if (!patient) return notFound();
    if (parsedQuery.data.include !== "all") return NextResponse.json(patient);

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
        and(
          eq(patientLinks.questionnaryId, questionnaries.id),
          eq(questionnaries.userId, userId),
        ),
      )
      .leftJoin(patientDiaries, eq(patientLinks.diaryId, patientDiaries.id))
      .where(
        and(
          eq(patientLinks.patientId, parsedId.data),
          eq(patientLinks.userId, userId),
        ),
      );

    return NextResponse.json({
      ...patient,
      patientLinks: links.map((link) => ({
        ...link,
        lastAnswered: formatDateTime(link.lastAnswered),
      })),
    });
  },
);

export const PUT = withApiHandler(
  async (request: Request, { params }: RouteContext) => {
    const userId = await requireUserId();
    const parsedId = parseRouteId((await params).id);
    if (!parsedId.success) return parsedId.response;

    const parsed = await parseJson(request, patientUpdateSchema);
    if (!parsed.success) return parsed.response;
    if (parsed.data.id !== parsedId.data) {
      return NextResponse.json(
        { errors: { id: ["O ID do corpo deve corresponder ao ID da rota."] } },
        { status: 400 },
      );
    }

    const values = parsed.data;
    const [updated] = await getDb()
      .update(patients)
      .set({
        name: values.name,
        email: values.email,
        phone: values.phone,
        cpf: values.cpf,
        birth: values.birth ?? null,
        weight: values.weight,
        height: values.height,
      })
      .where(
        and(eq(patients.id, parsedId.data), eq(patients.userId, userId)),
      )
      .returning({ id: patients.id });

    return updated ? new Response(null, { status: 204 }) : notFound();
  },
);

export const DELETE = withApiHandler(
  async (_request: Request, { params }: RouteContext) => {
    const userId = await requireUserId();
    const parsedId = parseRouteId((await params).id);
    if (!parsedId.success) return parsedId.response;

    const [deleted] = await getDb()
      .delete(patients)
      .where(
        and(eq(patients.id, parsedId.data), eq(patients.userId, userId)),
      )
      .returning({ id: patients.id });

    return deleted ? new Response(null, { status: 204 }) : notFound();
  },
);
