import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  conflict,
  parseJson,
  withApiHandler,
} from "@/lib/api/handler";
import { requireUserId } from "@/lib/auth";
import { getDb, withTransaction } from "@/lib/db";
import { questionnaries } from "@/lib/db/schema";
import { guardrails } from "@/lib/guardrails";
import {
  insertQuestion,
  loadQuestionnaires,
} from "@/lib/services/questionnaires";
import { questionnaireInputSchema } from "@/lib/validation/schemas";

function questionnaireGuardrailError(
  questions: Array<{ alternatives: unknown[] }>,
) {
  if (questions.length > guardrails.maxQuestions) {
    return conflict("Você atingiu o número máximo de perguntas neste questionário.");
  }

  if (
    questions.some(
      (question) =>
        question.alternatives.length > guardrails.maxAlternatives,
    )
  ) {
    return conflict("Você atingiu o número máximo de alternativas em uma pergunta.");
  }

  return null;
}

export const GET = withApiHandler(async () => {
  const userId = await requireUserId();
  return NextResponse.json(await loadQuestionnaires(userId));
});

export const POST = withApiHandler(async (request: Request) => {
  const userId = await requireUserId();
  const parsed = await parseJson(request, questionnaireInputSchema);
  if (!parsed.success) return parsed.response;

  const nestedGuardrailError = questionnaireGuardrailError(
    parsed.data.questions,
  );
  if (nestedGuardrailError) return nestedGuardrailError;

  const db = getDb();
  const [{ value: questionnaireCount }] = await db
    .select({ value: count() })
    .from(questionnaries)
    .where(eq(questionnaries.userId, userId));

  if (questionnaireCount >= guardrails.maxQuestionnaires) {
    return conflict("Você atingiu o número máximo de questionários.");
  }

  const createdId = await withTransaction(async (tx) => {
    const [created] = await tx
      .insert(questionnaries)
      .values({ name: parsed.data.name, userId })
      .returning({ id: questionnaries.id });

    for (const question of parsed.data.questions) {
      await insertQuestion(tx, created.id, question);
    }

    return created.id;
  });

  const [questionnaire] = await loadQuestionnaires(userId, createdId);
  return NextResponse.json(questionnaire, {
    status: 201,
    headers: { Location: `/api/questionnaires/${createdId}` },
  });
});
