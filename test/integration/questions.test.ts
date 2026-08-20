import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  DELETE,
  GET as getQuestion,
  PUT,
} from "@/app/api/questions/[id]/route";
import { GET as listQuestions, POST } from "@/app/api/questions/route";
import { getDb } from "@/lib/db";
import { questionAlternatives, questions } from "@/lib/db/schema";
import { guardrails } from "@/lib/guardrails";

import { jsonRequest, routeContext, seedQuestionnaire } from "./helpers";
import { signInAs, USER_A, USER_B } from "./session";

const anyRequest = () => new Request("https://nutrimurt.test/api/questions");

function questionPayload(
  questionnaryId: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    questionnaryId,
    questionText: "Come carne?",
    questionType: 3,
    alternatives: [{ alternative: "Sim" }, { alternative: "Não" }],
    ...overrides,
  };
}

async function create(questionnaryId: number, overrides = {}) {
  const response = await POST(
    jsonRequest(questionPayload(questionnaryId, overrides)),
  );
  expect(response.status).toBe(201);
  return response.json();
}

describe("POST /api/questions", () => {
  it("creates the question with its alternatives", async () => {
    const questionnaireId = await seedQuestionnaire(USER_A);

    signInAs(USER_A);
    const created = await create(questionnaireId);

    expect(created).toMatchObject({
      questionText: "Come carne?",
      questionnaryId: questionnaireId,
    });
    expect(created.alternatives).toHaveLength(2);
  });

  it("404s when the questionnaire belongs to another user", async () => {
    const foreign = await seedQuestionnaire(USER_B);

    signInAs(USER_A);
    const response = await POST(jsonRequest(questionPayload(foreign)));

    expect(response.status).toBe(404);
  });

  it("does not create the question when the questionnaire is not the caller's", async () => {
    const foreign = await seedQuestionnaire(USER_B);

    signInAs(USER_A);
    await POST(jsonRequest(questionPayload(foreign)));

    const rows = await getDb()
      .select()
      .from(questions)
      .where(eq(questions.questionnaryId, foreign));
    expect(rows).toEqual([]);
  });

  it("returns 409 past the per-questionnaire question guardrail", async () => {
    const questionnaireId = await seedQuestionnaire(USER_A);
    signInAs(USER_A);

    for (let index = 0; index < guardrails.maxQuestions; index += 1) {
      await create(questionnaireId, {
        questionText: `P${index}`,
        questionType: 1,
        alternatives: [],
      });
    }

    const response = await POST(
      jsonRequest(questionPayload(questionnaireId, { alternatives: [] })),
    );
    expect(response.status).toBe(409);
  });

  it("returns 409 past the alternative guardrail", async () => {
    const questionnaireId = await seedQuestionnaire(USER_A);

    signInAs(USER_A);
    const response = await POST(
      jsonRequest(
        questionPayload(questionnaireId, {
          alternatives: Array.from(
            { length: guardrails.maxAlternatives + 1 },
            (_, index) => ({ alternative: `A${index}` }),
          ),
        }),
      ),
    );

    expect(response.status).toBe(409);
  });
});

describe("GET /api/questions", () => {
  it("returns only questions under the caller's questionnaires", async () => {
    const mine = await seedQuestionnaire(USER_A, "Mine");
    const theirs = await seedQuestionnaire(USER_B, "Theirs");

    signInAs(USER_A);
    await create(mine, { questionText: "Minha", alternatives: [] });
    signInAs(USER_B);
    await create(theirs, { questionText: "Deles", alternatives: [] });

    signInAs(USER_A);
    const body = await (await listQuestions()).json();

    expect(body).toHaveLength(1);
    expect(body[0].questionText).toBe("Minha");
  });

  it("404s on a question under another user's questionnaire", async () => {
    const theirs = await seedQuestionnaire(USER_B);
    signInAs(USER_B);
    const foreign = await create(theirs);

    signInAs(USER_A);
    const response = await getQuestion(anyRequest(), routeContext(foreign.id));

    expect(response.status).toBe(404);
  });
});

describe("PUT /api/questions/[id]", () => {
  it("updates the text and syncs alternatives", async () => {
    const questionnaireId = await seedQuestionnaire(USER_A);
    signInAs(USER_A);
    const created = await create(questionnaireId);
    const kept = created.alternatives[0];

    const response = await PUT(
      jsonRequest(
        {
          id: created.id,
          questionnaryId: questionnaireId,
          questionText: "Consome carne?",
          questionType: 3,
          alternatives: [
            { id: kept.id, alternative: "Sim, sempre" },
            { alternative: "Raramente" },
          ],
        },
        "PUT",
      ),
      routeContext(created.id),
    );
    expect(response.status).toBe(204);

    const body = await (
      await getQuestion(anyRequest(), routeContext(created.id))
    ).json();

    expect(body.questionText).toBe("Consome carne?");
    expect(body.alternatives).toHaveLength(2);
    expect(body.alternatives[0]).toMatchObject({
      id: kept.id,
      alternative: "Sim, sempre",
    });
  });

  it("rejects an alternative id from a different question", async () => {
    const questionnaireId = await seedQuestionnaire(USER_A);
    signInAs(USER_A);
    const first = await create(questionnaireId);
    const second = await create(questionnaireId, {
      questionText: "Outra",
    });

    const response = await PUT(
      jsonRequest(
        {
          id: second.id,
          questionnaryId: questionnaireId,
          questionText: "Outra",
          questionType: 3,
          alternatives: [
            { id: first.alternatives[0].id, alternative: "Roubada" },
          ],
        },
        "PUT",
      ),
      routeContext(second.id),
    );

    expect(response.status).toBe(400);

    const victim = await (
      await getQuestion(anyRequest(), routeContext(first.id))
    ).json();
    expect(victim.alternatives[0].alternative).toBe("Sim");
  });

  it("refuses to move a question to another questionnaire", async () => {
    const source = await seedQuestionnaire(USER_A, "Origem");
    const target = await seedQuestionnaire(USER_A, "Destino");
    signInAs(USER_A);
    const created = await create(source, { alternatives: [] });

    const response = await PUT(
      jsonRequest(
        {
          id: created.id,
          questionnaryId: target,
          questionText: "Come carne?",
          questionType: 1,
          alternatives: [],
        },
        "PUT",
      ),
      routeContext(created.id),
    );

    expect(response.status).toBe(400);
  });

  it("will not update a question under another user's questionnaire", async () => {
    const theirs = await seedQuestionnaire(USER_B);
    signInAs(USER_B);
    const foreign = await create(theirs, { alternatives: [] });

    signInAs(USER_A);
    const response = await PUT(
      jsonRequest(
        {
          id: foreign.id,
          questionnaryId: theirs,
          questionText: "Hijacked",
          questionType: 1,
          alternatives: [],
        },
        "PUT",
      ),
      routeContext(foreign.id),
    );

    expect(response.status).toBe(404);

    signInAs(USER_B);
    const body = await (
      await getQuestion(anyRequest(), routeContext(foreign.id))
    ).json();
    expect(body.questionText).toBe("Come carne?");
  });
});

describe("DELETE /api/questions/[id]", () => {
  it("removes the question and its alternatives", async () => {
    const questionnaireId = await seedQuestionnaire(USER_A);
    signInAs(USER_A);
    const created = await create(questionnaireId);

    expect(
      (await DELETE(anyRequest(), routeContext(created.id))).status,
    ).toBe(204);

    const remaining = await getDb()
      .select()
      .from(questionAlternatives)
      .where(eq(questionAlternatives.questionId, created.id));
    expect(remaining).toEqual([]);
  });

  it("will not delete a question under another user's questionnaire", async () => {
    const theirs = await seedQuestionnaire(USER_B);
    signInAs(USER_B);
    const foreign = await create(theirs, { alternatives: [] });

    signInAs(USER_A);
    expect(
      (await DELETE(anyRequest(), routeContext(foreign.id))).status,
    ).toBe(404);

    signInAs(USER_B);
    expect(
      (await getQuestion(anyRequest(), routeContext(foreign.id))).status,
    ).toBe(200);
  });
});
