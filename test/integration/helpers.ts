import { getDb } from "@/lib/db";
import {
  patientDiaries,
  patientLinks,
  patients,
  questionAlternatives,
  questionnaries,
  questions,
} from "@/lib/db/schema";
import type { MealType, QuestionType } from "@/lib/db/schema";
import { generateUrlId } from "@/lib/url-id";

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

/** Inserts a question, with alternatives when the type calls for them. */
export async function seedQuestion(
  questionnaryId: number,
  questionText: string,
  questionType: QuestionType = 1,
  alternatives: string[] = [],
) {
  const db = getDb();
  const [question] = await db
    .insert(questions)
    .values({ questionnaryId, questionText, questionType })
    .returning({ id: questions.id });

  if (alternatives.length > 0) {
    await db
      .insert(questionAlternatives)
      .values(
        alternatives.map((alternative) => ({
          questionId: question.id,
          alternative,
        })),
      );
  }

  return question.id;
}

export function routeUrlIdContext(urlId: string) {
  return { params: Promise.resolve({ urlId }) };
}

export function linkRouteContext(patientId: number, linkId: number) {
  return {
    params: Promise.resolve({
      id: String(patientId),
      linkId: String(linkId),
    }),
  };
}

/** Inserts a questionnaire link, returning both ids and its urlId. */
export async function seedQuestionnaireLink(
  userId: string,
  patientId: number,
  questionnaryId: number,
) {
  const [row] = await getDb()
    .insert(patientLinks)
    .values({
      userId,
      patientId,
      urlId: generateUrlId(),
      type: 1,
      questionnaryId,
      diaryId: null,
    })
    .returning({ id: patientLinks.id, urlId: patientLinks.urlId });

  return row;
}

/** Inserts a diary plus the link that points at it. */
export async function seedDiaryLink(
  userId: string,
  patientId: number,
  diaryName = "Diário alimentar",
) {
  const db = getDb();
  const [diary] = await db
    .insert(patientDiaries)
    .values({ name: diaryName })
    .returning({ id: patientDiaries.id });

  const [row] = await db
    .insert(patientLinks)
    .values({
      userId,
      patientId,
      urlId: generateUrlId(),
      type: 2,
      questionnaryId: null,
      diaryId: diary.id,
    })
    .returning({ id: patientLinks.id, urlId: patientLinks.urlId });

  return { ...row, diaryId: diary.id };
}

export function diaryEntry(overrides: Record<string, unknown> = {}) {
  return {
    date: "2026-03-10",
    mealType: 1 as MealType,
    time: "2026-03-10T08:30:00",
    food: "Aveia",
    amount: "50g",
    ...overrides,
  };
}
