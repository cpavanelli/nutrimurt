import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

export type RateLimitPolicy =
  | "public-link-read"
  | "public-answer-write"
  | "api";

const PUBLIC_LINK_PATH = /^\/api\/public\/links\/[^/]+\/?$/;
const PUBLIC_ANSWER_PATH =
  /^\/api\/public\/links\/[^/]+\/(?:answers|diary)\/?$/;

export function selectRateLimitPolicy(
  method: string,
  pathname: string,
): RateLimitPolicy | null {
  if (!pathname.startsWith("/api/")) {
    return null;
  }

  if (method === "GET" && PUBLIC_LINK_PATH.test(pathname)) {
    return "public-link-read";
  }

  if (method === "POST" && PUBLIC_ANSWER_PATH.test(pathname)) {
    return "public-answer-write";
  }

  return "api";
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",", 1)[0]?.trim();

  return firstForwardedIp || headers.get("x-real-ip")?.trim() || "unknown";
}

export function isRateLimitConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function createRateLimiters() {
  const redis = Redis.fromEnv();

  return {
    // A 20-request sliding window over two seconds preserves nginx's 10 req/s
    // rate while allowing its configured burst of 20.
    "public-link-read": new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "2 s"),
      ephemeralCache: new Map(),
      prefix: "nutrimurt:rate-limit:public-link-read",
    }),
    // Likewise, 10 requests over two seconds is 5 req/s with a burst of 10.
    "public-answer-write": new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "2 s"),
      ephemeralCache: new Map(),
      prefix: "nutrimurt:rate-limit:public-answer-write",
    }),
    api: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      ephemeralCache: new Map(),
      prefix: "nutrimurt:rate-limit:api",
    }),
  } satisfies Record<RateLimitPolicy, Ratelimit>;
}

let rateLimiters: ReturnType<typeof createRateLimiters> | undefined;
let limitersUnavailable = false;

function getRateLimiters() {
  if (limitersUnavailable) {
    return undefined;
  }

  if (!rateLimiters) {
    try {
      rateLimiters = createRateLimiters();
    } catch (error) {
      limitersUnavailable = true;
      console.error("Rate limiting disabled: Redis unavailable.", error);
      return undefined;
    }
  }

  return rateLimiters;
}

/**
 * Fails open on purpose. The limiter runs in middleware, ahead of every API
 * request, so a missing Upstash binding or an Upstash outage would otherwise
 * take the entire API down — a worse outcome than not throttling. Absent
 * configuration is the normal state in local development and in CI.
 */
export async function rateLimitRequest(request: NextRequest) {
  const policy = selectRateLimitPolicy(
    request.method,
    request.nextUrl.pathname,
  );

  if (!policy || !isRateLimitConfigured()) {
    return null;
  }

  const limiters = getRateLimiters();

  if (!limiters) {
    return null;
  }

  try {
    return await limiters[policy].limit(getClientIp(request.headers));
  } catch (error) {
    console.error("Rate limit check failed; allowing the request.", error);
    return null;
  }
}
