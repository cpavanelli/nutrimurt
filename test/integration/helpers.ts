import { getDb } from "@/lib/db";
import { patients, questionnaries } from "@/lib/db/schema";

/** A CPF that passes the check-digit algorithm, for fixtures. */
export const VALID_CPF = "529.982.247-25";

export function patientPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Ana Souza",
    email: "ana@example.com",
    phone: "(11)91234-5678",
    cpf: VALID_CPF,
    birth: "1990-05-14",
    weight: 62,
    height: 168,
    ...overrides,
  };
}

export function jsonRequest(body: unknown, method = "POST") {
  return new Request("https://nutrimurt.test/api", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function routeContext(id: number | string) {
  return { params: Promise.resolve({ id: String(id) }) };
}

/** Inserts a patient directly, bypassing the route under test. */
export async function seedPatient(userId: string, name = "Seeded") {
  const [row] = await getDb()
    .insert(patients)
    .values({
      userId,
      name,
      email: `${name.toLowerCase()}@example.com`,
      phone: "(11)91234-5678",
      cpf: VALID_CPF,
      birth: null,
      weight: 70,
      height: 175,
      createdAt: new Date(),
    })
    .returning({ id: patients.id });

  return row.id;
}

/** Inserts a questionnaire directly, bypassing the route under test. */
export async function seedQuestionnaire(userId: string, name = "Anamnese") {
  const [row] = await getDb()
    .insert(questionnaries)
    .values({ userId, name })
    .returning({ id: questionnaries.id });

  return row.id;
}
