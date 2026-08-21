import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  conflict,
  notFound,
  parseJson,
  parseRouteId,
  withApiHandler,
} from "@/lib/api/handler";
import { requireUserId } from "@/lib/auth";
import { getDb, withTransaction } from "@/lib/db";
import { patientMealPlanEntries, patientMealPlans } from "@/lib/db/schema";
import { guardrails } from "@/lib/guardrails";
import { loadMealPlan, patientBelongsToUser } from "@/lib/services/meal-plans";
import { mealPlanInputSchema } from "@/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withApiHandler(
  async (_request: Request, { params }: RouteContext) => {
    const userId = await requireUserId();
    const parsedId = parseRouteId((await params).id);
    if (!parsedId.success) return parsedId.response;

    const plan = await loadMealPlan(userId, parsedId.data);
    if (!plan) return notFound();

    return NextResponse.json(plan);
  },
);

export const PUT = withApiHandler(
  async (request: Request, { params }: RouteContext) => {
    const userId = await requireUserId();
    const parsedId = parseRouteId((await params).id);
    if (!parsedId.success) return parsedId.response;

    const parsed = await parseJson(request, mealPlanInputSchema);
    if (!parsed.success) return parsed.response;

    const { id, patientId, name, totalCals, mealPlanDate, entries } =
      parsed.data;

    // The .NET action returned a bare 400 when the body id disagreed with the
    // route id.
    if (id !== undefined && id !== parsedId.data) {
      return new Response(null, { status: 400 });
    }

    // Order matters for parity: the entry guardrail was checked before the
    // patient lookup, so an oversized payload for someone else's patient
    // returns 409 rather than 404.
    if (entries.length > guardrails.maxMealPlanEntriesPerPlan) {
      return conflict(
        "Você atingiu o número máximo de entradas para este plano alimentar.",
      );
    }

    if (!(await patientBelongsToUser(userId, patientId))) return notFound();

    const [existing] = await getDb()
      .select({ id: patientMealPlans.id })
      .from(patientMealPlans)
      .where(
        and(
          eq(patientMealPlans.id, parsedId.data),
          eq(patientMealPlans.userId, userId),
        ),
      )
      .limit(1);

    if (!existing) return notFound();

    await withTransaction(async (tx) => {
      await tx
        .update(patientMealPlans)
        .set({ patientId, name, totalCals, mealPlanDate })
        .where(eq(patientMealPlans.id, existing.id));

      await tx
        .delete(patientMealPlanEntries)
        .where(eq(patientMealPlanEntries.patientMealPlanId, existing.id));

      if (entries.length > 0) {
        await tx.insert(patientMealPlanEntries).values(
          entries.map((entry) => ({
            patientMealPlanId: existing.id,
            ...entry,
          })),
        );
      }
    });

    return new Response(null, { status: 204 });
  },
);

export const DELETE = withApiHandler(
  async (_request: Request, { params }: RouteContext) => {
    const userId = await requireUserId();
    const parsedId = parseRouteId((await params).id);
    if (!parsedId.success) return parsedId.response;

    // Entries cascade from patient_meal_plans, as they did through EF Core.
    const deleted = await getDb()
      .delete(patientMealPlans)
      .where(
        and(
          eq(patientMealPlans.id, parsedId.data),
          eq(patientMealPlans.userId, userId),
        ),
      )
      .returning({ id: patientMealPlans.id });

    if (deleted.length === 0) return notFound();

    return new Response(null, { status: 204 });
  },
);
