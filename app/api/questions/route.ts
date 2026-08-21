import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  conflict,
  notFound,
  parseJson,
  withApiHandler,
} from "@/lib/api/handler";
import { requireUserId } from "@/lib/auth";
import { getDb, withTransaction } from "@/lib/db";
import { questionnaries, questions } from "@/lib/db/schema";
import { guardrails } from "@/lib/guardrails";
import {
  insertQuestion,
  loadQuestionnaires,
} from "@/lib/services/questionnaires";
import { questionInputSchema } from "@/lib/validation/schemas";

export const GET = withApiHandler(async () => {
  const userId = await requireUserId();
  const questionnaires = await loadQuestionnaires(userId);
  return NextResponse.json(
    questionnaires.flatMap((questionnaire) => questionnaire.questions),
  );
});

export const POST = withApiHandler(async (request: Request) => {
  const userId = await requireUserId();
  const parsed = await parseJson(request, questionInputSchema);
  if (!parsed.success) return parsed.response;
  if (parsed.data.alternatives.length > guardrails.maxAlternatives) {
    return conflict("Você atingiu o número máximo de alternativas em uma pergunta.");
  }

  const db = getDb();
  const [ownedQuestionnaire] = await db
    .select({ id: questionnaries.id })
    .from(questionnaries)
    .where(
      and(
        eq(questionnaries.id, parsed.data.questionnaryId),
        eq(questionnaries.userId, userId),
      ),
    )
    .limit(1);
  if (!ownedQuestionnaire) return notFound();

  const [{ value: questionCount }] = await db
    .select({ value: count() })
    .from(questions)
    .innerJoin(
      questionnaries,
      eq(questions.questionnaryId, questionnaries.id),
    )
    .where(
      and(
        eq(questions.questionnaryId, parsed.data.questionnaryId),
        eq(questionnaries.userId, userId),
      ),
    );
  if (questionCount >= guardrails.maxQuestions) {
    return conflict("Você atingiu o número máximo de perguntas neste questionário.");
  }

  const createdId = await withTransaction((tx) =>
    insertQuestion(tx, parsed.data.questionnaryId, parsed.data),
  );
  const [questionnaire] = await loadQuestionnaires(
    userId,
    parsed.data.questionnaryId,
  );
  const created = questionnaire.questions.find(
    (question) => question.id === createdId,
  );

  return NextResponse.json(created, {
    status: 201,
    headers: { Location: `/api/questions/${createdId}` },
  });
});
