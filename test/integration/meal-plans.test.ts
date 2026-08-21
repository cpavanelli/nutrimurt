import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { GET as getPdf } from "@/app/api/meal-plans/[id]/pdf/route";
import {
  DELETE as deletePlan,
  GET as getPlan,
  PUT as updatePlan,
} from "@/app/api/meal-plans/[id]/route";
import { GET as listPlans, POST as createPlan } from "@/app/api/meal-plans/route";
import { getDb } from "@/lib/db";
import { patientMealPlanEntries, patientMealPlans } from "@/lib/db/schema";
import { guardrails } from "@/lib/guardrails";

import { jsonRequest, routeContext, seedPatient } from "./helpers";
import { signInAs, USER_A, USER_B } from "./session";

const anyRequest = () => new Request("https://nutrimurt.test/api");

function mealPlanPayload(patientId: number, overrides: Record<string, unknown> = {}) {
  return {
    id: 0,
    patientId,
    name: "Plano de março",
    totalCals: 2450,
    mealPlanDate: "2026-03-10",
    entries: [
      {
        mealType: 1,
        food: "Ovos mexidos",
        amount: "2 un",
        substitution: false,
        substitution2: false,
      },
      {
        mealType: 1,
        food: "Tapioca",
        amount: "1 un",
        substitution: true,
        substitution2: false,
      },
      {
        mealType: 2,
        food: "Arroz integral",
        amount: "4 col",
        substitution: false,
        substitution2: true,
      },
    ],
    ...overrides,
  };
}

function entries(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    mealType: ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5,
    food: `Alimento ${index + 1}`,
    amount: "1 un",
    substitution: false,
    substitution2: false,
  }));
}

describe("POST /api/meal-plans", () => {
  it("creates a plan with its entries", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");

    const response = await createPlan(jsonRequest(mealPlanPayload(patientId)));
    expect(response.status).toBe(201);

    const created = await response.json();
    expect(created).toMatchObject({
      patientId,
      patientName: "Ana",
      name: "Plano de março",
      totalCals: 2450,
      mealPlanDate: "2026-03-10",
    });
    expect(created.entries).toHaveLength(3);
    expect(response.headers.get("Location")).toBe(
      `/api/meal-plans/${created.id}`,
    );
  });

  it("404s when the patient belongs to another user", async () => {
    const patientId = await seedPatient(USER_A, "Ana");

    signInAs(USER_B);
    const response = await createPlan(jsonRequest(mealPlanPayload(patientId)));

    expect(response.status).toBe(404);
  });

  it("enforces the plan guardrail", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");

    for (let i = 0; i < guardrails.maxMealPlans; i += 1) {
      await createPlan(jsonRequest(mealPlanPayload(patientId)));
    }

    const response = await createPlan(jsonRequest(mealPlanPayload(patientId)));
    expect(response.status).toBe(409);
    expect((await response.json()).detail).toContain("planos alimentares");
  });

  it("enforces the entries-per-plan guardrail", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");

    const response = await createPlan(
      jsonRequest(
        mealPlanPayload(patientId, {
          entries: entries(guardrails.maxMealPlanEntriesPerPlan + 1),
        }),
      ),
    );

    expect(response.status).toBe(409);
    expect(await getDb().select().from(patientMealPlans)).toHaveLength(0);
  });

  it("rejects an invalid payload in the apiClient error shape", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");

    const response = await createPlan(
      jsonRequest(mealPlanPayload(patientId, { name: "" })),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).errors.name).toEqual([
      "O nome é obrigatório.",
    ]);
  });
});

describe("GET /api/meal-plans", () => {
  it("lists the caller's plans newest plan date first", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");

    await createPlan(
      jsonRequest(mealPlanPayload(patientId, { mealPlanDate: "2026-01-05" })),
    );
    await createPlan(
      jsonRequest(mealPlanPayload(patientId, { mealPlanDate: "2026-06-20" })),
    );

    const response = await listPlans();
    expect(response.status).toBe(200);

    const plans = await response.json();
    expect(plans.map((p: { mealPlanDate: string }) => p.mealPlanDate)).toEqual([
      "2026-06-20",
      "2026-01-05",
    ]);
    expect(plans[0].patientName).toBe("Ana");
  });

  it("does not list another user's plans", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");
    await createPlan(jsonRequest(mealPlanPayload(patientId)));

    signInAs(USER_B);
    const response = await listPlans();

    expect(await response.json()).toEqual([]);
  });
});

describe("GET /api/meal-plans/[id]", () => {
  it("returns the plan with patient weight and entries", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");
    const { id } = await (
      await createPlan(jsonRequest(mealPlanPayload(patientId)))
    ).json();

    const response = await getPlan(anyRequest(), routeContext(id));
    expect(response.status).toBe(200);

    const plan = await response.json();
    expect(plan.patientWeight).toBe(70);
    expect(plan.entries).toHaveLength(3);
    expect(plan.entries[2]).toMatchObject({
      food: "Arroz integral",
      substitution2: true,
    });
  });

  it("404s for another user's plan", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");
    const { id } = await (
      await createPlan(jsonRequest(mealPlanPayload(patientId)))
    ).json();

    signInAs(USER_B);
    const response = await getPlan(anyRequest(), routeContext(id));

    expect(response.status).toBe(404);
  });
});

describe("PUT /api/meal-plans/[id]", () => {
  it("replaces the entries rather than appending", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");
    const { id } = await (
      await createPlan(jsonRequest(mealPlanPayload(patientId)))
    ).json();

    const response = await updatePlan(
      jsonRequest(
        mealPlanPayload(patientId, {
          id,
          name: "Plano revisado",
          entries: entries(2),
        }),
        "PUT",
      ),
      routeContext(id),
    );

    expect(response.status).toBe(204);

    const plan = await (await getPlan(anyRequest(), routeContext(id))).json();
    expect(plan.name).toBe("Plano revisado");
    expect(plan.entries).toHaveLength(2);
    expect(plan.entries[0].food).toBe("Alimento 1");
  });

  it("400s when the body id disagrees with the route id", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");
    const { id } = await (
      await createPlan(jsonRequest(mealPlanPayload(patientId)))
    ).json();

    const response = await updatePlan(
      jsonRequest(mealPlanPayload(patientId, { id: id + 999 }), "PUT"),
      routeContext(id),
    );

    expect(response.status).toBe(400);
  });

  it("404s for another user's plan and leaves it untouched", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");
    const { id } = await (
      await createPlan(jsonRequest(mealPlanPayload(patientId)))
    ).json();

    signInAs(USER_B);
    const otherPatientId = await seedPatient(USER_B, "Bruno");
    const response = await updatePlan(
      jsonRequest(
        mealPlanPayload(otherPatientId, { id, name: "Sequestrado" }),
        "PUT",
      ),
      routeContext(id),
    );

    expect(response.status).toBe(404);

    signInAs(USER_A);
    const plan = await (await getPlan(anyRequest(), routeContext(id))).json();
    expect(plan.name).toBe("Plano de março");
  });
});

describe("DELETE /api/meal-plans/[id]", () => {
  it("removes the plan and cascades its entries", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");
    const { id } = await (
      await createPlan(jsonRequest(mealPlanPayload(patientId)))
    ).json();

    const response = await deletePlan(anyRequest(), routeContext(id));
    expect(response.status).toBe(204);

    expect(await getDb().select().from(patientMealPlans)).toHaveLength(0);
    expect(
      await getDb()
        .select()
        .from(patientMealPlanEntries)
        .where(eq(patientMealPlanEntries.patientMealPlanId, id)),
    ).toHaveLength(0);
  });

  it("404s for another user's plan", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");
    const { id } = await (
      await createPlan(jsonRequest(mealPlanPayload(patientId)))
    ).json();

    signInAs(USER_B);
    expect((await deletePlan(anyRequest(), routeContext(id))).status).toBe(404);

    signInAs(USER_A);
    expect(await getDb().select().from(patientMealPlans)).toHaveLength(1);
  });
});

describe("GET /api/meal-plans/[id]/pdf", () => {
  it("streams a PDF named after the patient and plan date", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "João Conceição");
    const { id } = await (
      await createPlan(jsonRequest(mealPlanPayload(patientId)))
    ).json();

    const response = await getPdf(anyRequest(), routeContext(id));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");

    const disposition = response.headers.get("Content-Disposition") ?? "";
    // apiClient.ts parses this to name the download.
    expect(disposition).toContain(
      'filename="plano-alimentar-joao-conceicao-2026-03-10.pdf"',
    );
    expect(response.headers.get("Access-Control-Expose-Headers")).toBe(
      "Content-Disposition",
    );

    const body = Buffer.from(await response.arrayBuffer());
    expect(body.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 60_000);

  it("404s for another user's plan", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");
    const { id } = await (
      await createPlan(jsonRequest(mealPlanPayload(patientId)))
    ).json();

    signInAs(USER_B);
    const response = await getPdf(anyRequest(), routeContext(id));

    expect(response.status).toBe(404);
  }, 60_000);
});
