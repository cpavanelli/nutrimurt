import { describe, expect, it } from "vitest";

import { URL_ID_PATTERN, generateUrlId } from "./url-id";

describe("generateUrlId", () => {
  it("produces 32 lowercase hex characters to fill the CHAR(32) column", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const urlId = generateUrlId();
      expect(urlId).toHaveLength(32);
      expect(urlId).toMatch(URL_ID_PATTERN);
    }
  });

  it("does not repeat", () => {
    const generated = new Set(
      Array.from({ length: 500 }, () => generateUrlId()),
    );
    expect(generated.size).toBe(500);
  });
});

describe("URL_ID_PATTERN", () => {
  it("rejects values that are not exactly 32 lowercase hex characters", () => {
    const rejected = [
      "",
      "abc",
      "A".repeat(32),
      "0123456789abcdef0123456789abcde",
      "0123456789abcdef0123456789abcdef0",
      "0123456789abcdef0123456789abcdeg",
      " 0123456789abcdef0123456789abcde",
      "../../etc/passwd",
    ];

    for (const value of rejected) {
      expect(URL_ID_PATTERN.test(value)).toBe(false);
    }
  });

  it("accepts a generated id", () => {
    expect(URL_ID_PATTERN.test(generateUrlId())).toBe(true);
  });
});
