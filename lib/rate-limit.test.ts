import { afterEach, describe, expect, it } from "vitest";

import type { NextRequest } from "next/server";

import {
  getClientIp,
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

describe("rateLimitRequest", () => {
  const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
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
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    expect(isRateLimitConfigured()).toBe(false);
    await expect(rateLimitRequest(apiRequest())).resolves.toBeNull();
  });

  it("reports configured only when both Upstash variables are present", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(isRateLimitConfigured()).toBe(false);

    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    expect(isRateLimitConfigured()).toBe(true);
  });
});
