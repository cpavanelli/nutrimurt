import { NextResponse } from "next/server";

import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await requireUserId();

  return NextResponse.json({ userId });
}
