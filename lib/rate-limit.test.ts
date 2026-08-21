import { afterEach, describe, expect, it } from "vitest";

import type { NextRequest } from "next/server";

import {
  getClientIp,
  getRedisCredentials,
  isRateLimitConfigured,
  rateLimitRequest,
  selectRateLimitPolicy,
} from "./rate-limit";

describe("selectRateLimitPolicy", () => {
  it("uses the public-link read policy only for GET requests", () => {
    expect(
      selectRateLimitPolicy("GET", "/api/public/links/0123456789abcdef"),
    ).toBe("public-link-read");
    expect(
      selectRateLimitPolicy("POST", "/api/public/links/0123456789abcdef"),
    ).toBe("api");
  });

  it.each(["answers", "diary"])(
    "uses the public-answer write policy for POST /%s",
    (resource) => {
      expect(
        selectRateLimitPolicy(
          "POST",
          `/api/public/links/0123456789abcdef/${resource}`,
        ),
      ).toBe("public-answer-write");
    },
  );

  it("uses the global policy for every other API request", () => {
    expect(selectRateLimitPolicy("GET", "/api/patients")).toBe("api");
    expect(
      selectRateLimitPolicy(
        "GET",
        "/api/public/links/0123456789abcdef/answers",
      ),
    ).toBe("api");
  });

  it("does not rate limit page requests", () => {
    expect(selectRateLimitPolicy("GET", "/patients")).toBeNull();
  });
});

describe("getClientIp", () => {
  it("uses the first address from Vercel's forwarded chain", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 198.51.100.4",
      "x-real-ip": "198.51.100.4",
    });

    expect(getClientIp(headers)).toBe("203.0.113.10");
  });

  it("falls back to x-real-ip and then a stable unknown key", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "203.0.113.11" }))).toBe(
      "203.0.113.11",
    );
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});

const REDIS_VARS = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
] as const;

function clearRedisEnv() {
  for (const key of REDIS_VARS) {
    delete process.env[key];
  }
}

describe("rateLimitRequest", () => {
  const saved = REDIS_VARS.map((key) => [key, process.env[key]] as const);

  afterEach(() => {
    for (const [key, value] of saved) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  function apiRequest() {
    return {
      method: "GET",
      nextUrl: { pathname: "/api/patients" },
      headers: new Headers({ "x-forwarded-for": "203.0.113.10" }),
    } as unknown as NextRequest;
  }

  // The limiter runs in middleware ahead of every API request, so an
  // unconfigured or unreachable Upstash must not take the API down with it.
  it("skips limiting instead of throwing when Upstash is not configured", async () => {
    clearRedisEnv();

    expect(isRateLimitConfigured()).toBe(false);
    await expect(rateLimitRequest(apiRequest())).resolves.toBeNull();
  });

  it("reports configured only when both variables are present", () => {
    clearRedisEnv();
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    expect(isRateLimitConfigured()).toBe(false);

    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    expect(isRateLimitConfigured()).toBe(true);
  });

  // Vercel's Upstash marketplace integration injects the KV_ names, which is
  // what actually shipped; reading only UPSTASH_ silently disabled limiting.
  it("accepts Vercel's KV_REST_API_* naming", () => {
    clearRedisEnv();
    process.env.KV_REST_API_URL = "https://example.upstash.io";
    process.env.KV_REST_API_TOKEN = "kv-token";

    expect(getRedisCredentials()).toEqual({
      url: "https://example.upstash.io",
      token: "kv-token",
    });
  });

  it("prefers UPSTASH_ over KV_ when both are set", () => {
    clearRedisEnv();
    process.env.UPSTASH_REDIS_REST_URL = "https://upstash.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "upstash-token";
    process.env.KV_REST_API_URL = "https://kv.example";
    process.env.KV_REST_API_TOKEN = "kv-token";

    expect(getRedisCredentials()).toEqual({
      url: "https://upstash.example",
      token: "upstash-token",
    });
  });
});
