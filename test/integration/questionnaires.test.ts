import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  DELETE,
  GET as getQuestionnaire,
  PUT,
} from "@/app/api/questionnaires/[id]/route";
import {
  GET as listQuestionnaires,
  POST,
} from "@/app/api/questionnaires/route";
import { getDb } from "@/lib/db";
import { questionAlternatives, questions } from "@/lib/db/schema";
import { guardrails } from "@/lib/guardrails";

import { jsonRequest, routeContext, seedQuestionnaire } from "./helpers";
import { signInAs, USER_A, USER_B } from "./session";

const anyRequest = () => new Request("https://nutrimurt.test/api/questionnaires");

function questionnairePayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Anamnese",
    questions: [
      { questionText: "Qual seu objetivo?", questionType: 1, alternatives: [] },
      {
        questionText: "Come carne?",
        questionType: 3,
        alternatives: [{ alternative: "Sim" }, { alternative: "Não" }],
      },
    ],
    ...overrides,
  };
}

async function create(payload: unknown = questionnairePayload()) {
  const response = await POST(jsonRequest(payload));
  expect(response.status).toBe(201);
  return response.json();
}

describe("POST /api/questionnaires", () => {
  it("creates the questionnaire with its questions and alternatives", async () => {
    signInAs(USER_A);
    const created = await create();

    expect(created.name).toBe("Anamnese");
    expect(created.questions).toHaveLength(2);
    expect(created.questions[1].alternatives.map((a: never) => a)).toHaveLength(
      2,
    );
  });

  it("returns 409 past the questionnaire guardrail", async () => {
    for (let index = 0; index < guardrails.maxQuestionnaires; index += 1) {
      await seedQuestionnaire(USER_A, `Q${index}`);
    }

    signInAs(USER_A);
    const response = await POST(jsonRequest(questionnairePayload()));

    expect(response.status).toBe(409);
  });

  it("returns 409 past the nested question guardrail", async () => {
    signInAs(USER_A);
    const response = await POST(
      jsonRequest(
        questionnairePayload({
          questions: Array.from(
            { length: guardrails.maxQuestions + 1 },
            (_, index) => ({
              questionText: `P${index}`,
              questionType: 1,
              alternatives: [],
            }),
          ),
        }),
      ),
    );

    expect(response.status).toBe(409);
  });

  it("leaves nothing behind when a nested guardrail rejects the request", async () => {
    signInAs(USER_A);
    await POST(
      jsonRequest(
        questionnairePayload({
          questions: Array.from(
            { length: guardrails.maxQuestions + 1 },
            (_, index) => ({
              questionText: `P${index}`,
              questionType: 1,
              alternatives: [],
            }),
          ),
        }),
      ),
    );

    const body = await (await listQuestionnaires()).json();
    expect(body).toEqual([]);
  });
});

describe("GET /api/questionnaires", () => {
  it("returns only the caller's questionnaires", async () => {
    signInAs(USER_B);
    await create(questionnairePayload({ name: "Theirs" }));

    signInAs(USER_A);
    await create(questionnairePayload({ name: "Mine" }));

    const body = await (await listQuestionnaires()).json();
    expect(body.map((q: { name: string }) => q.name)).toEqual(["Mine"]);
  });

  it("includes alternatives, so the editor can round-trip them", async () => {
    signInAs(USER_A);
    await create();

    const body = await (await listQuestionnaires()).json();
    expect(body[0].questions[1].alternatives).toHaveLength(2);
  });

  it("404s on another user's questionnaire", async () => {
    signInAs(USER_B);
    const theirs = await create();

    signInAs(USER_A);
    const response = await getQuestionnaire(
      anyRequest(),
      routeContext(theirs.id),
    );

    expect(response.status).toBe(404);
  });
});

describe("PUT /api/questionnaires/[id] — sync algorithm", () => {
  it("renames, keeps existing ids, adds and removes questions", async () => {
    signInAs(USER_A);
    const created = await create();
    const kept = created.questions[0];

    const response = await PUT(
      jsonRequest(
        {
          id: created.id,
          name: "Anamnese v2",
          questions: [
            { id: kept.id, questionText: "Objetivo revisado", questionType: 1, alternatives: [] },
            { questionText: "Nova pergunta", questionType: 1, alternatives: [] },
          ],
        },
        "PUT",
      ),
      routeContext(created.id),
    );
    expect(response.status).toBe(204);

    const body = await (
      await getQuestionnaire(anyRequest(), routeContext(created.id))
    ).json();

    expect(body.name).toBe("Anamnese v2");
    expect(body.questions).toHaveLength(2);
    expect(body.questions[0]).toMatchObject({
      id: kept.id,
      questionText: "Objetivo revisado",
    });
    expect(body.questions[1].questionText).toBe("Nova pergunta");
  });

  it("deletes the alternatives of a removed question", async () => {
    signInAs(USER_A);
    const created = await create();
    const removed = created.questions[1];

    await PUT(
      jsonRequest(
        { id: created.id, name: "Anamnese", questions: [] },
        "PUT",
      ),
      routeContext(created.id),
    );

    const orphans = await getDb()
      .select()
      .from(questionAlternatives)
      .where(eq(questionAlternatives.questionId, removed.id));

    expect(orphans).toEqual([]);
  });

  it("edits, adds and removes alternatives in place", async () => {
    signInAs(USER_A);
    const created = await create();
    const question = created.questions[1];
    const keptAlternative = question.alternatives[0];

    await PUT(
      jsonRequest(
        {
          id: created.id,
          name: "Anamnese",
          questions: [
            {
              id: question.id,
              questionText: question.questionText,
              questionType: 3,
              alternatives: [
                { id: keptAlternative.id, alternative: "Sim, sempre" },
                { alternative: "Às vezes" },
              ],
            },
          ],
        },
        "PUT",
      ),
      routeContext(created.id),
    );

    const body = await (
      await getQuestionnaire(anyRequest(), routeContext(created.id))
    ).json();
    const alternatives = body.questions[0].alternatives;

    expect(alternatives).toHaveLength(2);
    expect(alternatives[0]).toMatchObject({
      id: keptAlternative.id,
      alternative: "Sim, sempre",
    });
    expect(alternatives[1].alternative).toBe("Às vezes");
  });

  it("rejects a question id belonging to a different questionnaire", async () => {
    signInAs(USER_A);
    const first = await create();
    const second = await create(questionnairePayload({ name: "Outro" }));

    const response = await PUT(
      jsonRequest(
        {
          id: second.id,
          name: "Outro",
          questions: [
            {
              id: first.questions[0].id,
              questionText: "Roubada",
              questionType: 1,
              alternatives: [],
            },
          ],
        },
        "PUT",
      ),
      routeContext(second.id),
    );

    expect(response.status).toBe(400);

    // The victim questionnaire is untouched.
    const body = await (
      await getQuestionnaire(anyRequest(), routeContext(first.id))
    ).json();
    expect(body.questions[0].questionText).toBe("Qual seu objetivo?");
  });

  it("will not update another user's questionnaire", async () => {
    signInAs(USER_B);
    const theirs = await create(questionnairePayload({ name: "Theirs" }));

    signInAs(USER_A);
    const response = await PUT(
      jsonRequest(
        { id: theirs.id, name: "Hijacked", questions: [] },
        "PUT",
      ),
      routeContext(theirs.id),
    );

    expect(response.status).toBe(404);

    signInAs(USER_B);
    const body = await (
      await getQuestionnaire(anyRequest(), routeContext(theirs.id))
    ).json();
    expect(body.name).toBe("Theirs");
    expect(body.questions).toHaveLength(2);
  });
});

describe("DELETE /api/questionnaires/[id]", () => {
  it("removes the questionnaire, its questions and their alternatives", async () => {
    signInAs(USER_A);
    const created = await create();

    expect(
      (await DELETE(anyRequest(), routeContext(created.id))).status,
    ).toBe(204);

    const remainingQuestions = await getDb()
      .select()
      .from(questions)
      .where(eq(questions.questionnaryId, created.id));
    const remainingAlternatives = await getDb()
      .select()
      .from(questionAlternatives);

    expect(remainingQuestions).toEqual([]);
    expect(remainingAlternatives).toEqual([]);
  });

  it("will not delete another user's questionnaire", async () => {
    signInAs(USER_B);
    const theirs = await create();

    signInAs(USER_A);
    expect(
      (await DELETE(anyRequest(), routeContext(theirs.id))).status,
    ).toBe(404);
  });
});
