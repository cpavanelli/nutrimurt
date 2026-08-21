import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The PDF route reads its TTFs from `lib/pdf/fonts` at runtime rather than
   * importing them, so Next's tracer cannot see them and would ship a function
   * without the fonts. Rendering then throws only in production.
   */
  outputFileTracingIncludes: {
    "/api/meal-plans/[id]/pdf": ["./lib/pdf/fonts/**"],
  },
  /**
   * The Content-Security-Policy is deliberately absent here.
   * `clerkMiddleware` emits it instead, so it can carry a per-request nonce
   * and the active Clerk Frontend API host — both of which differ between
   * preview and production. A second static policy in this file would be a
   * duplicate source of truth that drifts silently.
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
