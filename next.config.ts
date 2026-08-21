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
};

export default nextConfig;
