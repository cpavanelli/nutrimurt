import { describe, expect, it } from "vitest";

import { UnauthorizedError } from "@/lib/auth";

import { parseJson, parseRouteId, withApiHandler } from "./handler";
import { patientInputSchema } from "../validation/schemas";

describe("withApiHandler", () => {
  it("maps UnauthorizedError to 401", async () => {
    const handler = withApiHandler(async () => {
      throw new UnauthorizedError();
    });

    const response = await handler();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});

describe("parseJson", () => {
  it("returns validation errors in the API client contract", async () => {
    const request = new Request("https://example.test/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    const result = await parseJson(request, patientInputSchema);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.response.status).toBe(400);
    const body = await result.response.json();
    expect(body.errors).toEqual(expect.objectContaining({ name: expect.any(Array) }));
  });
});

describe("parseRouteId", () => {
  it("accepts a positive integer", () => {
    const result = parseRouteId("42");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toBe(42);
  });

  it.each(["0", "-1", "1.5", "abc", "", " 1 "])(
    "rejects %s with a 400 in the API client contract",
    async (value) => {
      const result = parseRouteId(value);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(Object.values(body.errors).flat()).toContain("ID inválido.");
    },
  );
});
