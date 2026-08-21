import type { NextConfig } from "next";

const contentSecurityPolicy =
  "default-src 'self'; script-src 'self' https://clerk.nutrimurt.com.br https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://clerk.nutrimurt.com.br https://img.clerk.com; connect-src 'self' https://clerk.nutrimurt.com.br https://challenges.cloudflare.com; worker-src 'self' blob:; frame-src 'self' https://clerk.nutrimurt.com.br https://challenges.cloudflare.com;";

const nextConfig: NextConfig = {
  /**
   * The PDF route reads its TTFs from `lib/pdf/fonts` at runtime rather than
   * importing them, so Next's tracer cannot see them and would ship a function
   * without the fonts. Rendering then throws only in production.
   */
  outputFileTracingIncludes: {
    "/api/meal-plans/[id]/pdf": ["./lib/pdf/fonts/**"],
  },
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
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
