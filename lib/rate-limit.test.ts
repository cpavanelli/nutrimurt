import { describe, expect, it } from "vitest";

import { getClientIp, selectRateLimitPolicy } from "./rate-limit";

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
