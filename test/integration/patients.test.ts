import { describe, expect, it } from "vitest";

import { GET as getPatient, PUT, DELETE } from "@/app/api/patients/[id]/route";
import { GET as listPatients, POST } from "@/app/api/patients/route";
import { guardrails } from "@/lib/guardrails";

import {
  jsonRequest,
  patientPayload,
  routeContext,
  seedPatient,
} from "./helpers";
import { signInAs, USER_A, USER_B } from "./session";

const anyRequest = () => new Request("https://nutrimurt.test/api/patients");

describe("POST /api/patients", () => {
  it("creates a patient scoped to the caller", async () => {
    signInAs(USER_A);

    const response = await POST(jsonRequest(patientPayload()));
    expect(response.status).toBe(201);

    const created = await response.json();
    expect(created).toMatchObject({ name: "Ana Souza", weight: 62 });
    expect(response.headers.get("Location")).toBe(
      `/api/patients/${created.id}`,
    );
  });

  it("rejects an invalid CPF with the apiClient error shape", async () => {
    signInAs(USER_A);

    const response = await POST(
      jsonRequest(patientPayload({ cpf: "123.456.789-00" })),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errors.cpf).toEqual(["CPF inválido."]);
  });

  it("rejects a phone that react-imask would not produce", async () => {
    signInAs(USER_A);

    const response = await POST(
      jsonRequest(patientPayload({ phone: "11912345678" })),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errors.phone).toBeDefined();
  });

  it("returns 409 once the guardrail is reached", async () => {
    signInAs(USER_A);
    for (let index = 0; index < guardrails.maxPatients; index += 1) {
      await seedPatient(USER_A, `Patient${index}`);
    }

    const response = await POST(jsonRequest(patientPayload()));

    expect(response.status).toBe(409);
    expect((await response.json()).detail).toContain("número máximo");
  });

  it("counts the guardrail per user, not globally", async () => {
    for (let index = 0; index < guardrails.maxPatients; index += 1) {
      await seedPatient(USER_B, `Other${index}`);
    }

    signInAs(USER_A);
    const response = await POST(jsonRequest(patientPayload()));

    expect(response.status).toBe(201);
  });
});

describe("GET /api/patients", () => {
  it("returns only the caller's patients", async () => {
    await seedPatient(USER_A, "Mine");
    await seedPatient(USER_B, "Theirs");

    signInAs(USER_A);
    const body = await (await listPatients()).json();

    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Mine");
  });
});

describe("GET /api/patients/[id]", () => {
  it("404s on another user's patient rather than leaking it", async () => {
    const foreignId = await seedPatient(USER_B, "Theirs");

    signInAs(USER_A);
    const response = await getPatient(anyRequest(), routeContext(foreignId));

    expect(response.status).toBe(404);
  });

  it("returns patientLinks when include=all", async () => {
    const id = await seedPatient(USER_A, "Mine");

    signInAs(USER_A);
    const response = await getPatient(
      new Request(`https://nutrimurt.test/api/patients/${id}?include=all`),
      routeContext(id),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ patientLinks: [] });
  });

  it("omits patientLinks without include=all", async () => {
    const id = await seedPatient(USER_A, "Mine");

    signInAs(USER_A);
    const body = await (
      await getPatient(anyRequest(), routeContext(id))
    ).json();

    expect(body.patientLinks).toBeUndefined();
  });

  it("rejects a non-numeric id in Portuguese", async () => {
    signInAs(USER_A);
    const response = await getPatient(anyRequest(), routeContext("abc"));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(Object.values(body.errors).flat()).toContain("ID inválido.");
  });
});

describe("PUT /api/patients/[id]", () => {
  it("updates the caller's patient", async () => {
    const id = await seedPatient(USER_A, "Mine");

    signInAs(USER_A);
    const response = await PUT(
      jsonRequest({ ...patientPayload({ name: "Renamed" }), id }, "PUT"),
      routeContext(id),
    );

    expect(response.status).toBe(204);

    const body = await (
      await getPatient(anyRequest(), routeContext(id))
    ).json();
    expect(body.name).toBe("Renamed");
  });

  it("400s when the body id does not match the route id", async () => {
    const id = await seedPatient(USER_A, "Mine");

    signInAs(USER_A);
    const response = await PUT(
      jsonRequest({ ...patientPayload(), id: id + 1 }, "PUT"),
      routeContext(id),
    );

    expect(response.status).toBe(400);
  });

  it("will not update another user's patient", async () => {
    const foreignId = await seedPatient(USER_B, "Theirs");

    signInAs(USER_A);
    const response = await PUT(
      jsonRequest({ ...patientPayload({ name: "Hijacked" }), id: foreignId }, "PUT"),
      routeContext(foreignId),
    );

    expect(response.status).toBe(404);

    signInAs(USER_B);
    const body = await (
      await getPatient(anyRequest(), routeContext(foreignId))
    ).json();
    expect(body.name).toBe("Theirs");
  });
});

describe("DELETE /api/patients/[id]", () => {
  it("deletes the caller's patient", async () => {
    const id = await seedPatient(USER_A, "Mine");

    signInAs(USER_A);
    expect((await DELETE(anyRequest(), routeContext(id))).status).toBe(204);
    expect(
      (await getPatient(anyRequest(), routeContext(id))).status,
    ).toBe(404);
  });

  it("will not delete another user's patient", async () => {
    const foreignId = await seedPatient(USER_B, "Theirs");

    signInAs(USER_A);
    expect(
      (await DELETE(anyRequest(), routeContext(foreignId))).status,
    ).toBe(404);

    signInAs(USER_B);
    expect(
      (await getPatient(anyRequest(), routeContext(foreignId))).status,
    ).toBe(200);
  });
});

describe("unauthenticated access", () => {
  it("returns 401 rather than falling through to an unscoped query", async () => {
    await seedPatient(USER_A, "Mine");

    signInAs(null);
    const response = await listPatients();

    expect(response.status).toBe(401);
  });
});
