import { NextResponse } from "next/server";

import { isRateLimitConfigured } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export function GET() {
  // Rate limiting fails open, so a missing Redis binding degrades silently by
  // design. Report it here so the deploy is verifiable without waiting for a
  // 429 that would never arrive.
  return NextResponse.json({
    status: "ok",
    rateLimiting: isRateLimitConfigured() ? "active" : "disabled",
  });
}
