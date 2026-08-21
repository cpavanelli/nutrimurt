import { notFound, parseRouteId, withApiHandler } from "@/lib/api/handler";
import { requireUserId } from "@/lib/auth";
import { slugify } from "@/lib/pdf/slug";
import { renderMealPlanPdf } from "@/lib/pdf/render";
import { loadMealPlan } from "@/lib/services/meal-plans";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * `@react-pdf/renderer` needs Node APIs — fontkit reads the TTFs off disk — so
 * this cannot run on the edge runtime.
 */
export const runtime = "nodejs";

/**
 * R3. A 50-entry plan, the guardrail maximum, renders in well under a second
 * locally; 30s is headroom, not an expectation. Vercel's Hobby plan caps
 * below this, in which case the platform value wins — confirm on the target
 * plan rather than assuming this is what runs.
 */
export const maxDuration = 30;

export const GET = withApiHandler(
  async (_request: Request, { params }: RouteContext) => {
    const userId = await requireUserId();
    const parsedId = parseRouteId((await params).id);
    if (!parsedId.success) return parsedId.response;

    const plan = await loadMealPlan(userId, parsedId.data);
    if (!plan) return notFound();

    const pdf = await renderMealPlanPdf({
      id: plan.id,
      patientName: plan.patientName,
      patientWeight: plan.patientWeight,
      name: plan.name,
      totalCals: plan.totalCals,
      mealPlanDate: plan.mealPlanDate,
      entries: plan.entries,
    });

    const filename = `plano-alimentar-${slugify(plan.patientName)}-${plan.mealPlanDate}.pdf`;

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // `requestBlob()` in apiClient.ts parses this to name the download,
        // so the header has to survive. Same-origin from PR 6 onward, but
        // Access-Control-Expose-Headers is set anyway for the window where
        // the old SPA is still on another origin.
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Access-Control-Expose-Headers": "Content-Disposition",
        "Cache-Control": "no-store",
      },
    });
  },
);
