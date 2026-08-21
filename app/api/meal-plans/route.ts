import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  conflict,
  notFound,
  parseJson,
  withApiHandler,
} from "@/lib/api/handler";
import { requireUserId } from "@/lib/auth";
import { getDb, withTransaction } from "@/lib/db";
import { patientMealPlanEntries, patientMealPlans } from "@/lib/db/schema";
import { guardrails } from "@/lib/guardrails";
import {
  loadMealPlan,
  loadMealPlans,
  patientBelongsToUser,
} from "@/lib/services/meal-plans";
import { mealPlanInputSchema } from "@/lib/validation/schemas";

export const GET = withApiHandler(async () => {
  const userId = await requireUserId();
  return NextResponse.json(await loadMealPlans(userId));
});

export const POST = withApiHandler(async (request: Request) => {
  const userId = await requireUserId();
  const parsed = await parseJson(request, mealPlanInputSchema);
  if (!parsed.success) return parsed.response;

  const { patientId, name, totalCals, mealPlanDate, entries } = parsed.data;

  if (!(await patientBelongsToUser(userId, patientId))) return notFound();

  const [{ value: planCount }] = await getDb()
    .select({ value: count() })
    .from(patientMealPlans)
    .where(eq(patientMealPlans.userId, userId));

  if (planCount >= guardrails.maxMealPlans) {
    return conflict("Você atingiu o número máximo de planos alimentares.");
  }

  if (entries.length > guardrails.maxMealPlanEntriesPerPlan) {
    return conflict(
      "Você atingiu o número máximo de entradas para este plano alimentar.",
    );
  }

  const created = await withTransaction(async (tx) => {
    const [plan] = await tx
      .insert(patientMealPlans)
      .values({
        userId,
        patientId,
        name,
        totalCals,
        mealPlanDate,
        createdAt: new Date(),
      })
      .returning({ id: patientMealPlans.id });

    if (entries.length > 0) {
      await tx.insert(patientMealPlanEntries).values(
        entries.map((entry) => ({
          patientMealPlanId: plan.id,
          ...entry,
        })),
      );
    }

    return plan;
  });

  return NextResponse.json(await loadMealPlan(userId, created.id), {
    status: 201,
    headers: { Location: `/api/meal-plans/${created.id}` },
  });
});
