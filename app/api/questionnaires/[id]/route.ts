import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  conflict,
  notFound,
  parseJson,
  parseRouteId,
  withApiHandler,
} from "@/lib/api/handler";
import { requireUserId } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import {
  questionAlternatives,
  questionnaries,
  questions,
} from "@/lib/db/schema";
import { guardrails } from "@/lib/guardrails";
import {
  insertQuestion,
  loadQuestionnaires,
} from "@/lib/services/questionnaires";
import { questionnaireUpdateSchema } from "@/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function duplicateIds(values: Array<{ id?: number }>): boolean {
  const ids = values.filter((value) => value.id).map((value) => value.id);
  return ids.length !== new Set(ids).size;
}

export const GET = withApiHandler(
  async (_request: Request, { params }: RouteContext) => {
    const userId = await requireUserId();
    const parsedId = parseRouteId((await params).id);
    if (!parsedId.success) return parsedId.response;

    const [questionnaire] = await loadQuestionnaires(userId, parsedId.data);
    return questionnaire ? NextResponse.json(questionnaire) : notFound();
  },
);

export const PUT = withApiHandler(
  async (request: Request, { params }: RouteContext) => {
    const userId = await requireUserId();
    const parsedId = parseRouteId((await params).id);
    if (!parsedId.success) return parsedId.response;

    const parsed = await parseJson(request, questionnaireUpdateSchema);
    if (!parsed.success) return parsed.response;
    if (parsed.data.id !== parsedId.data) {
      return NextResponse.json(
        { errors: { id: ["O ID do corpo deve corresponder ao ID da rota."] } },
        { status: 400 },
      );
    }
    if (parsed.data.questions.length > guardrails.maxQuestions) {
      return conflict("Você atingiu o número máximo de perguntas neste questionário.");
    }
    if (
      parsed.data.questions.some(
        (question) =>
          question.alternatives.length > guardrails.maxAlternatives,
      )
    ) {
      return conflict("Você atingiu o número máximo de alternativas em uma pergunta.");
    }
    if (
      duplicateIds(parsed.data.questions) ||
      parsed.data.questions.some((question) => duplicateIds(question.alternatives))
    ) {
      return NextResponse.json(
        { errors: { id: ["IDs duplicados não são permitidos."] } },
        { status: 400 },
      );
    }

    const [existing] = await loadQuestionnaires(userId, parsedId.data);
    if (!existing) return notFound();

    const existingQuestions = new Map(
      existing.questions.map((question) => [question.id, question]),
    );
    for (const incoming of parsed.data.questions) {
      if (incoming.id && !existingQuestions.has(incoming.id)) {
        return NextResponse.json(
          { errors: { questions: ["Uma pergunta não pertence a este questionário."] } },
          { status: 400 },
        );
      }

      const existingQuestion = incoming.id
        ? existingQuestions.get(incoming.id)
        : undefined;
      const existingAlternativeIds = new Set(
        existingQuestion?.alternatives.map((alternative) => alternative.id) ?? [],
      );
      if (
        incoming.alternatives.some(
          (alternative) =>
            Boolean(alternative.id) &&
            !existingAlternativeIds.has(alternative.id as number),
        )
      ) {
        return NextResponse.json(
          { errors: { alternatives: ["Uma alternativa não pertence a esta pergunta."] } },
          { status: 400 },
        );
      }
    }

    await withTransaction(async (tx) => {
      await tx
        .update(questionnaries)
        .set({ name: parsed.data.name })
        .where(
          and(
            eq(questionnaries.id, parsedId.data),
            eq(questionnaries.userId, userId),
          ),
        );

      const keptQuestionIds = new Set(
        parsed.data.questions
          .filter((question) => question.id)
          .map((question) => question.id as number),
      );
      const removedQuestionIds = existing.questions
        .filter((question) => !keptQuestionIds.has(question.id))
        .map((question) => question.id);

      if (removedQuestionIds.length > 0) {
        await tx
          .delete(questionAlternatives)
          .where(inArray(questionAlternatives.questionId, removedQuestionIds));
        await tx
          .delete(questions)
          .where(inArray(questions.id, removedQuestionIds));
      }

      for (const incoming of parsed.data.questions) {
        if (!incoming.id) {
          await insertQuestion(tx, parsedId.data, incoming);
          continue;
        }

        await tx
          .update(questions)
          .set({
            questionText: incoming.questionText,
            questionType: incoming.questionType,
          })
          .where(
            and(
              eq(questions.id, incoming.id),
              eq(questions.questionnaryId, parsedId.data),
            ),
          );

        const existingQuestion = existingQuestions.get(incoming.id)!;
        const keptAlternativeIds = new Set(
          incoming.alternatives
            .filter((alternative) => alternative.id)
            .map((alternative) => alternative.id as number),
        );
        const removedAlternativeIds = existingQuestion.alternatives
          .filter((alternative) => !keptAlternativeIds.has(alternative.id))
          .map((alternative) => alternative.id);

        if (removedAlternativeIds.length > 0) {
          await tx
            .delete(questionAlternatives)
            .where(
              and(
                inArray(questionAlternatives.id, removedAlternativeIds),
                eq(questionAlternatives.questionId, incoming.id),
              ),
            );
        }

        for (const alternative of incoming.alternatives) {
          if (alternative.id) {
            await tx
              .update(questionAlternatives)
              .set({ alternative: alternative.alternative })
              .where(
                and(
                  eq(questionAlternatives.id, alternative.id),
                  eq(questionAlternatives.questionId, incoming.id),
                ),
              );
          } else {
            await tx.insert(questionAlternatives).values({
              questionId: incoming.id,
              alternative: alternative.alternative,
            });
          }
        }
      }
    });

    return new Response(null, { status: 204 });
  },
);

export const DELETE = withApiHandler(
  async (_request: Request, { params }: RouteContext) => {
    const userId = await requireUserId();
    const parsedId = parseRouteId((await params).id);
    if (!parsedId.success) return parsedId.response;

    const [existing] = await loadQuestionnaires(userId, parsedId.data);
    if (!existing) return notFound();

    const questionIds = existing.questions.map((question) => question.id);
    const deleted = await withTransaction(async (tx) => {
      if (questionIds.length > 0) {
        await tx
          .delete(questionAlternatives)
          .where(inArray(questionAlternatives.questionId, questionIds));
      }

      const [row] = await tx
        .delete(questionnaries)
        .where(
          and(
            eq(questionnaries.id, parsedId.data),
            eq(questionnaries.userId, userId),
          ),
        )
        .returning({ id: questionnaries.id });

      return row;
    });

    return deleted ? new Response(null, { status: 204 }) : notFound();
  },
);
