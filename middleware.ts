import {
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { rateLimitRequest } from "@/lib/rate-limit";

const isPublicRoute = createRouteMatcher([
  "/answer/:urlId",
  "/api/public/:path*",
  "/api/health",
  "/sign-in/:path*",
]);

export default clerkMiddleware(async (auth, request, event) => {
  const rateLimit = await rateLimitRequest(request);

  if (rateLimit) {
    event.waitUntil(rateLimit.pending);

    if (!rateLimit.success) {
      const retryAfter = Math.max(
        0,
        Math.ceil((rateLimit.reset - Date.now()) / 1_000),
      );

      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
          },
        },
      );
    }
  }

  if (isPublicRoute(request)) {
    return;
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    return;
  }

  // `signInUrl` on ClerkProvider only steers client-side navigation. The
  // middleware resolves its own redirect target, and without this it sends
  // users to Clerk's hosted Account Portal instead of our sign-in page.
  await auth.protect({
    unauthenticatedUrl: new URL("/sign-in", request.url).toString(),
  });
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
