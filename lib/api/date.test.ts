import { describe, expect, it } from "vitest";

import { formatDateTime } from "./date";

describe("formatDateTime", () => {
  it("renders in America/Sao_Paulo, not UTC", () => {
    // The .NET original rendered this instant as "10/03/2026 01:30".
    expect(formatDateTime(new Date("2026-03-10T01:30:00Z"))).toBe(
      "09/03/2026 22:30",
    );
  });

  it("passes null through", () => {
    expect(formatDateTime(null)).toBeNull();
  });
});
