import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { renderMealPlanPdf } from "./render";
import type { MealPlanPdfData } from "./MealPlanDocument";

const plan: MealPlanPdfData = {
  id: 1,
  patientName: "João Conceição",
  patientWeight: 82,
  name: "Plano de março",
  totalCals: 2450,
  mealPlanDate: "2026-03-10",
  entries: [
    {
      id: 1,
      mealType: 1,
      food: "Ovos mexidos",
      amount: "2 un",
      substitution: false,
      substitution2: false,
    },
    {
      id: 2,
      mealType: 1,
      food: "Pão integral",
      amount: "2 fatias",
      substitution: false,
      substitution2: false,
    },
    {
      id: 3,
      mealType: 1,
      food: "Tapioca",
      amount: "1 un",
      substitution: true,
      substitution2: false,
    },
    {
      id: 4,
      mealType: 1,
      food: "Cuscuz",
      amount: "100 g",
      substitution: false,
      substitution2: true,
    },
    {
      id: 5,
      mealType: 2,
      food: "Arroz integral",
      amount: "4 col",
      substitution: false,
      substitution2: false,
    },
    {
      id: 6,
      mealType: 2,
      food: "Frango grelhado",
      amount: "150 g",
      substitution: false,
      substitution2: false,
    },
    {
      id: 7,
      mealType: 3,
      food: "Iogurte natural",
      amount: "170 g",
      substitution: false,
      substitution2: false,
    },
    {
      id: 8,
      mealType: 4,
      food: "Sopa de legumes",
      amount: "1 prato",
      substitution: false,
      substitution2: false,
    },
    {
      id: 9,
      mealType: 5,
      food: "Castanhas",
      amount: "30 g",
      substitution: false,
      substitution2: false,
    },
  ],
};

describe("renderMealPlanPdf", () => {
  it("renders a PDF", async () => {
    const buffer = await renderMealPlanPdf(plan);

    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);

    // Written out so the layout can be compared by eye against a PDF from the
    // current production API — the acceptance bar for this port (R2).
    if (process.env.PDF_SAMPLE_DIR) {
      await mkdir(process.env.PDF_SAMPLE_DIR, { recursive: true });
      await writeFile(
        path.join(process.env.PDF_SAMPLE_DIR, "meal-plan-sample.pdf"),
        buffer,
      );
    }
  }, 60_000);

  it("renders a plan with no entries", async () => {
    const buffer = await renderMealPlanPdf({ ...plan, entries: [] });

    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 60_000);

  it("renders a full 50-entry plan, the guardrail maximum (R3)", async () => {
    const entries = Array.from({ length: 50 }, (_, index) => ({
      id: index + 1,
      mealType: ((index % 5) + 1) as MealPlanPdfData["entries"][number]["mealType"],
      food: `Alimento ${index + 1}`,
      amount: `${index + 1} g`,
      substitution: index % 7 === 0,
      substitution2: index % 11 === 0,
    }));

    const started = Date.now();
    const buffer = await renderMealPlanPdf({ ...plan, entries });
    const elapsed = Date.now() - started;

    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    // maxDuration on the route is 30s. Nowhere near it, but this fails loudly
    // if a change makes rendering pathological.
    expect(elapsed).toBeLessThan(20_000);
  }, 60_000);
});
