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
import { questionAlternatives, questions } from "@/lib/db/schema";
import { guardrails } from "@/lib/guardrails";
import { loadQuestion } from "@/lib/services/questionnaires";
import { questionUpdateSchema } from "@/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withApiHandler(
  async (_request: Request, { params }: RouteContext) => {
    const userId = await requireUserId();
    const parsedId = parseRouteId((await params).id);
    if (!parsedId.success) return parsedId.response;

    const question = await loadQuestion(userId, parsedId.data);
    return question ? NextResponse.json(question) : notFound();
  },
);

export const PUT = withApiHandler(
  async (request: Request, { params }: RouteContext) => {
    const userId = await requireUserId();
    const parsedId = parseRouteId((await params).id);
    if (!parsedId.success) return parsedId.response;

    const parsed = await parseJson(request, questionUpdateSchema);
    if (!parsed.success) return parsed.response;
    if (parsed.data.id !== parsedId.data) {
      return NextResponse.json(
        { errors: { id: ["O ID do corpo deve corresponder ao ID da rota."] } },
        { status: 400 },
      );
    }
    if (parsed.data.alternatives.length > guardrails.maxAlternatives) {
      return conflict("Você atingiu o número máximo de alternativas em uma pergunta.");
    }

    const existing = await loadQuestion(userId, parsedId.data);
    if (!existing) return notFound();
    if (existing.questionnaryId !== parsed.data.questionnaryId) {
      return NextResponse.json(
        { errors: { questionnaryId: ["A pergunta não pode ser movida para outro questionário."] } },
        { status: 400 },
      );
    }

    const incomingIds = parsed.data.alternatives
      .filter((alternative) => alternative.id)
      .map((alternative) => alternative.id as number);
    if (incomingIds.length !== new Set(incomingIds).size) {
      return NextResponse.json(
        { errors: { alternatives: ["IDs duplicados não são permitidos."] } },
        { status: 400 },
      );
    }
    const existingIds = new Set(
      existing.alternatives.map((alternative) => alternative.id),
    );
    if (incomingIds.some((id) => !existingIds.has(id))) {
      return NextResponse.json(
        { errors: { alternatives: ["Uma alternativa não pertence a esta pergunta."] } },
        { status: 400 },
      );
    }

    await withTransaction(async (tx) => {
      await tx
        .update(questions)
        .set({
          questionText: parsed.data.questionText,
          questionType: parsed.data.questionType,
        })
        .where(
          and(
            eq(questions.id, parsedId.data),
            eq(questions.questionnaryId, existing.questionnaryId),
          ),
        );

      const keptIds = new Set(incomingIds);
      const removedIds = existing.alternatives
        .filter((alternative) => !keptIds.has(alternative.id))
        .map((alternative) => alternative.id);
      if (removedIds.length > 0) {
        await tx
          .delete(questionAlternatives)
          .where(
            and(
              inArray(questionAlternatives.id, removedIds),
              eq(questionAlternatives.questionId, parsedId.data),
            ),
          );
      }

      for (const alternative of parsed.data.alternatives) {
        if (alternative.id) {
          await tx
            .update(questionAlternatives)
            .set({ alternative: alternative.alternative })
            .where(
              and(
                eq(questionAlternatives.id, alternative.id),
                eq(questionAlternatives.questionId, parsedId.data),
              ),
            );
        } else {
          await tx.insert(questionAlternatives).values({
            questionId: parsedId.data,
            alternative: alternative.alternative,
          });
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

    const existing = await loadQuestion(userId, parsedId.data);
    if (!existing) return notFound();

    const deleted = await withTransaction(async (tx) => {
      await tx
        .delete(questionAlternatives)
        .where(eq(questionAlternatives.questionId, parsedId.data));

      const [row] = await tx
        .delete(questions)
        .where(
          and(
            eq(questions.id, parsedId.data),
            eq(questions.questionnaryId, existing.questionnaryId),
          ),
        )
        .returning({ id: questions.id });

      return row;
    });

    return deleted ? new Response(null, { status: 204 }) : notFound();
  },
);
