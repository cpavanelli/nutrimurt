import { Suspense } from "react";

import MealPlanForm from "@/features/mealPlans/MealPlanForm";

/**
 * MealPlanForm reads `?patientId=` via useSearchParams, which forces a client
 * bailout during prerender unless it sits under a Suspense boundary. The SPA
 * wrapped its whole router in `<Suspense fallback={null}>`, so null keeps the
 * same absence of a loading flash.
 */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <MealPlanForm />
    </Suspense>
  );
}
