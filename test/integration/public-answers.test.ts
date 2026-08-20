import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { POST as postAnswers } from "@/app/api/public/links/[urlId]/answers/route";
import { POST as postDiary } from "@/app/api/public/links/[urlId]/diary/route";
import { GET as getPublicLink } from "@/app/api/public/links/[urlId]/route";
import { getDb } from "@/lib/db";
import {
  patientDiaryEntries,
  patientQuestionAnswerAlternatives,
  patientQuestionAnswers,
} from "@/lib/db/schema";
import { guardrails } from "@/lib/guardrails";

import {
  diaryEntry,
  jsonRequest,
  routeUrlIdContext,
  seedDiaryLink,
  seedPatient,
  seedQuestion,
  seedQuestionnaire,
  seedQuestionnaireLink,
} from "./helpers";
import { signInAs, USER_A, USER_B } from "./session";

/** These routes are reached by patients with no session at all. */
const anonymous = () => signInAs(null);

async function seedQuestionnaireFixture(userId = USER_A) {
  const patientId = await seedPatient(userId, "Ana");
  const questionnaryId = await seedQuestionnaire(userId);
  const textQuestionId = await seedQuestion(
    questionnaryId,
    "Como você se sente?",
    1,
  );
  const choiceQuestionId = await seedQuestion(
    questionnaryId,
    "Quais refeições faz?",
    3,
    ["Café", "Almoço", "Jantar"],
  );
  const link = await seedQuestionnaireLink(userId, patientId, questionnaryId);

  return { patientId, questionnaryId, textQuestionId, choiceQuestionId, link };
}

describe("GET /api/public/links/[urlId]", () => {
  it("leaks nothing about the patient beyond their name", async () => {
    const { link } = await seedQuestionnaireFixture();
    anonymous();

    const response = await getPublicLink(
      new Request("https://nutrimurt.test/api"),
      routeUrlIdContext(link.urlId),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.patient).toEqual({ name: "Ana" });
    expect(Object.keys(body.patient)).toEqual(["name"]);
    expect(body).not.toHaveProperty("patient_id");

    // The seeded patient's other columns must not appear anywhere in the
    // serialised payload, however deeply nested.
    const serialised = JSON.stringify(body);
    for (const secret of [
      "ana@example.com",
      "529.982.247-25",
      "(11)91234-5678",
    ]) {
      expect(serialised).not.toContain(secret);
    }
  });

  it("404s an unknown link", async () => {
    anonymous();

    const response = await getPublicLink(
      new Request("https://nutrimurt.test/api"),
      routeUrlIdContext("0".repeat(32)),
    );

    expect(response.status).toBe(404);
  });

  it("rejects a malformed urlId before it reaches a query", async () => {
    anonymous();

    const response = await getPublicLink(
      new Request("https://nutrimurt.test/api"),
      routeUrlIdContext("not-a-url-id"),
    );

    expect(response.status).toBe(400);
  });
});

describe("POST /api/public/links/[urlId]/answers", () => {
  it("saves text answers and multiple-choice selections", async () => {
    const { textQuestionId, choiceQuestionId, link } =
      await seedQuestionnaireFixture();
    anonymous();

    const response = await postAnswers(
      jsonRequest({
        questions: [
          {
            id: textQuestionId,
            questionType: 1,
            answer: { answer: "Bem" },
            answerAlternatives: [],
          },
          {
            id: choiceQuestionId,
            questionType: 3,
            answerAlternatives: ["Café", "Jantar"],
          },
        ],
      }),
      routeUrlIdContext(link.urlId),
    );

    expect(response.status).toBe(200);

    const db = getDb();
    const answers = await db
      .select()
      .from(patientQuestionAnswers)
      .where(eq(patientQuestionAnswers.patientLinkId, link.id));
    expect(answers).toHaveLength(1);
    expect(answers[0].answer).toBe("Bem");

    const selections = await db
      .select()
      .from(patientQuestionAnswerAlternatives)
      .where(eq(patientQuestionAnswerAlternatives.patientLinkId, link.id));
    expect(selections.map((row) => row.alternative).sort()).toEqual([
      "Café",
      "Jantar",
    ]);
  });

  it("replaces previous answers rather than appending", async () => {
    const { textQuestionId, link } = await seedQuestionnaireFixture();
    anonymous();

    const submit = (answer: string) =>
      postAnswers(
        jsonRequest({
          questions: [
            { id: textQuestionId, questionType: 1, answer: { answer } },
          ],
        }),
        routeUrlIdContext(link.urlId),
      );

    await submit("Primeira");
    await submit("Segunda");

    const answers = await getDb()
      .select()
      .from(patientQuestionAnswers)
      .where(eq(patientQuestionAnswers.patientLinkId, link.id));

    expect(answers).toHaveLength(1);
    expect(answers[0].answer).toBe("Segunda");
  });

  /**
   * R9 regression. The Python service resolved the link by `urlId` only to
   * prove it existed, then wrote using the `id` in the request body. Holding
   * any one valid `urlId` was therefore enough to overwrite a different
   * patient's answers. The body can no longer name a target at all, so the
   * closest equivalent — submitting one patient's `urlId` while another
   * patient's link exists — must leave the other link untouched.
   */
  it("cannot write to a link other than the one named in the path", async () => {
    const victim = await seedQuestionnaireFixture(USER_A);
    const attacker = await seedQuestionnaireFixture(USER_B);

    anonymous();

    // Seed a real answer on the victim's link.
    await postAnswers(
      jsonRequest({
        questions: [
          {
            id: victim.textQuestionId,
            questionType: 1,
            answer: { answer: "Resposta da vítima" },
          },
        ],
      }),
      routeUrlIdContext(victim.link.urlId),
    );

    // Now submit through the attacker's own link, naming the victim's link id
    // and question id in the body the way the old payload allowed.
    const response = await postAnswers(
      jsonRequest({
        id: victim.link.id,
        urlId: victim.link.urlId,
        questions: [
          {
            id: attacker.textQuestionId,
            questionType: 1,
            answer: { answer: "Sobrescrito" },
          },
        ],
      }),
      routeUrlIdContext(attacker.link.urlId),
    );

    expect(response.status).toBe(200);

    const victimAnswers = await getDb()
      .select()
      .from(patientQuestionAnswers)
      .where(eq(patientQuestionAnswers.patientLinkId, victim.link.id));

    expect(victimAnswers).toHaveLength(1);
    expect(victimAnswers[0].answer).toBe("Resposta da vítima");
  });

  it("rejects a submission with more questions than the guardrail allows", async () => {
    const { textQuestionId, link } = await seedQuestionnaireFixture();
    anonymous();

    const response = await postAnswers(
      jsonRequest({
        questions: Array.from(
          { length: guardrails.maxQuestionsPerSubmission + 1 },
          () => ({
            id: textQuestionId,
            questionType: 1,
            answer: { answer: "x" },
          }),
        ),
      }),
      routeUrlIdContext(link.urlId),
    );

    expect(response.status).toBe(409);
  });

  it("rejects more selected alternatives than the guardrail allows", async () => {
    const { choiceQuestionId, link } = await seedQuestionnaireFixture();
    anonymous();

    const response = await postAnswers(
      jsonRequest({
        questions: [
          {
            id: choiceQuestionId,
            questionType: 3,
            answerAlternatives: Array.from(
              { length: guardrails.maxAnswerAlternativesPerQuestion + 1 },
              (_, index) => `Opção ${index}`,
            ),
          },
        ],
      }),
      routeUrlIdContext(link.urlId),
    );

    expect(response.status).toBe(409);
  });

  it("refuses to treat a diary link as a questionnaire", async () => {
    const patientId = await seedPatient(USER_A, "Bruno");
    const link = await seedDiaryLink(USER_A, patientId);
    anonymous();

    const response = await postAnswers(
      jsonRequest({ questions: [] }),
      routeUrlIdContext(link.urlId),
    );

    expect(response.status).toBe(422);
  });
});

describe("POST /api/public/links/[urlId]/diary", () => {
  it("stores the submitted time as the wall clock the patient typed", async () => {
    const patientId = await seedPatient(USER_A, "Bruno");
    const link = await seedDiaryLink(USER_A, patientId);
    anonymous();

    const response = await postDiary(
      jsonRequest({ entries: [diaryEntry()] }),
      routeUrlIdContext(link.urlId),
    );

    expect(response.status).toBe(200);

    const [entry] = await getDb()
      .select()
      .from(patientDiaryEntries)
      .where(eq(patientDiaryEntries.patientDiaryId, link.diaryId));

    // 08:30 in, 08:30 back out — not shifted into America/Sao_Paulo and not
    // shifted by whatever zone the test runner happens to be in.
    expect(entry.time?.toISOString()).toBe("2026-03-10T08:30:00.000Z");
    expect(entry.food).toBe("Aveia");
  });

  it("accepts a bare HH:MM time as well as a full ISO string", async () => {
    const patientId = await seedPatient(USER_A, "Bruno");
    const link = await seedDiaryLink(USER_A, patientId);
    anonymous();

    await postDiary(
      jsonRequest({ entries: [diaryEntry({ time: "21:45" })] }),
      routeUrlIdContext(link.urlId),
    );

    const [entry] = await getDb()
      .select()
      .from(patientDiaryEntries)
      .where(eq(patientDiaryEntries.patientDiaryId, link.diaryId));

    expect(entry.time?.toISOString()).toBe("2026-03-10T21:45:00.000Z");
  });

  it("replaces previous entries rather than appending", async () => {
    const patientId = await seedPatient(USER_A, "Bruno");
    const link = await seedDiaryLink(USER_A, patientId);
    anonymous();

    await postDiary(
      jsonRequest({ entries: [diaryEntry(), diaryEntry({ food: "Pão" })] }),
      routeUrlIdContext(link.urlId),
    );
    await postDiary(
      jsonRequest({ entries: [diaryEntry({ food: "Iogurte" })] }),
      routeUrlIdContext(link.urlId),
    );

    const entries = await getDb()
      .select()
      .from(patientDiaryEntries)
      .where(eq(patientDiaryEntries.patientDiaryId, link.diaryId));

    expect(entries).toHaveLength(1);
    expect(entries[0].food).toBe("Iogurte");
  });

  it("does not touch another link's diary", async () => {
    const victimPatient = await seedPatient(USER_A, "Ana");
    const victim = await seedDiaryLink(USER_A, victimPatient);
    const attackerPatient = await seedPatient(USER_B, "Bruno");
    const attacker = await seedDiaryLink(USER_B, attackerPatient);

    anonymous();

    await postDiary(
      jsonRequest({ entries: [diaryEntry({ food: "Da vítima" })] }),
      routeUrlIdContext(victim.urlId),
    );

    // The old payload carried diary_id; supplying it must change nothing.
    await postDiary(
      jsonRequest({
        diary_id: victim.diaryId,
        diaryId: victim.diaryId,
        entries: [diaryEntry({ food: "Do atacante" })],
      }),
      routeUrlIdContext(attacker.urlId),
    );

    const victimEntries = await getDb()
      .select()
      .from(patientDiaryEntries)
      .where(eq(patientDiaryEntries.patientDiaryId, victim.diaryId));

    expect(victimEntries).toHaveLength(1);
    expect(victimEntries[0].food).toBe("Da vítima");
  });

  it("rejects more entries in one day than the guardrail allows", async () => {
    const patientId = await seedPatient(USER_A, "Bruno");
    const link = await seedDiaryLink(USER_A, patientId);
    anonymous();

    const response = await postDiary(
      jsonRequest({
        entries: Array.from(
          { length: guardrails.maxDiaryEntriesPerDay + 1 },
          (_, index) => diaryEntry({ food: `Item ${index}` }),
        ),
      }),
      routeUrlIdContext(link.urlId),
    );

    expect(response.status).toBe(409);
  });

  it("refuses to treat a questionnaire link as a diary", async () => {
    const { link } = await seedQuestionnaireFixture();
    anonymous();

    const response = await postDiary(
      jsonRequest({ entries: [] }),
      routeUrlIdContext(link.urlId),
    );

    expect(response.status).toBe(422);
  });
});
