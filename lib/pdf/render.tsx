import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";

import { MealPlanDocument, type MealPlanPdfData } from "./MealPlanDocument";

/**
 * Kept apart from the component so route handlers and tests share one entry
 * point, and so the only place that touches `renderToBuffer` is here.
 */
export function renderMealPlanPdf(
  plan: MealPlanPdfData,
  issuedAt?: Date,
): Promise<Buffer> {
  return renderToBuffer(<MealPlanDocument plan={plan} issuedAt={issuedAt} />);
}
