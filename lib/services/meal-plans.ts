import { and, asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  patientMealPlanEntries,
  patientMealPlans,
  patients,
  type MealType,
} from "@/lib/db/schema";

export interface MealPlanEntryDto {
  id: number;
  mealType: MealType;
  food: string;
  amount: string;
  substitution: boolean;
  substitution2: boolean;
}

export interface MealPlanListDto {
  id: number;
  name: string;
  patientId: number;
  patientName: string;
  mealPlanDate: string;
  totalCals: number;
  createdAt: Date;
}

export interface MealPlanDetailDto {
  id: number;
  patientId: number;
  patientName: string;
  patientWeight: number;
  name: string;
  totalCals: number;
  mealPlanDate: string;
  createdAt: Date;
  entries: MealPlanEntryDto[];
}

/**
 * The .NET list action inner-joined patients scoped to the same user, so a
 * plan whose patient belongs to someone else simply did not appear. Kept as an
 * inner join for that reason rather than tidied into a left join.
 */
export async function loadMealPlans(
  userId: string,
): Promise<MealPlanListDto[]> {
  return getDb()
    .select({
      id: patientMealPlans.id,
      name: patientMealPlans.name,
      patientId: patients.id,
      patientName: patients.name,
      mealPlanDate: patientMealPlans.mealPlanDate,
      totalCals: patientMealPlans.totalCals,
      createdAt: patientMealPlans.createdAt,
    })
    .from(patientMealPlans)
    .innerJoin(
      patients,
      and(
        eq(patients.id, patientMealPlans.patientId),
        eq(patients.userId, userId),
      ),
    )
    .where(eq(patientMealPlans.userId, userId))
    .orderBy(desc(patientMealPlans.mealPlanDate));
}

export async function loadMealPlan(
  userId: string,
  id: number,
): Promise<MealPlanDetailDto | null> {
  const db = getDb();

  const [plan] = await db
    .select({
      id: patientMealPlans.id,
      patientId: patientMealPlans.patientId,
      patientName: patients.name,
      patientWeight: patients.weight,
      name: patientMealPlans.name,
      totalCals: patientMealPlans.totalCals,
      mealPlanDate: patientMealPlans.mealPlanDate,
      createdAt: patientMealPlans.createdAt,
    })
    .from(patientMealPlans)
    .innerJoin(
      patients,
      and(
        eq(patients.id, patientMealPlans.patientId),
        eq(patients.userId, userId),
      ),
    )
    .where(
      and(eq(patientMealPlans.id, id), eq(patientMealPlans.userId, userId)),
    )
    .limit(1);

  if (!plan) return null;

  const entries = await db
    .select({
      id: patientMealPlanEntries.id,
      mealType: patientMealPlanEntries.mealType,
      food: patientMealPlanEntries.food,
      amount: patientMealPlanEntries.amount,
      substitution: patientMealPlanEntries.substitution,
      substitution2: patientMealPlanEntries.substitution2,
    })
    .from(patientMealPlanEntries)
    .where(eq(patientMealPlanEntries.patientMealPlanId, plan.id))
    .orderBy(asc(patientMealPlanEntries.id));

  return { ...plan, entries };
}

export async function patientBelongsToUser(
  userId: string,
  patientId: number,
): Promise<boolean> {
  const [patient] = await getDb()
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.userId, userId)))
    .limit(1);

  return Boolean(patient);
}
