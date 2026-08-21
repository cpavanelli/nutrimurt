import { and, asc, eq } from "drizzle-orm";

import { getDb, type Transaction } from "@/lib/db";
import {
  questionAlternatives,
  questionnaries,
  questions,
} from "@/lib/db/schema";

export interface AlternativeDto {
  id: number;
  alternative: string;
}

export interface QuestionDto {
  id: number;
  questionText: string;
  questionType: 1 | 2 | 3;
  questionnaryId: number;
  alternatives: AlternativeDto[];
}

export interface QuestionnaireDto {
  id: number;
  name: string;
  questions: QuestionDto[];
}

export async function loadQuestionnaires(
  userId: string,
  questionnaireId?: number,
): Promise<QuestionnaireDto[]> {
  const db = getDb();
  const questionnaireFilter = questionnaireId
    ? and(
        eq(questionnaries.userId, userId),
        eq(questionnaries.id, questionnaireId),
      )
    : eq(questionnaries.userId, userId);

  const questionnaireRows = await db
    .select({ id: questionnaries.id, name: questionnaries.name })
    .from(questionnaries)
    .where(questionnaireFilter)
    .orderBy(asc(questionnaries.id));

  if (questionnaireRows.length === 0) return [];

  const ownedQuestionFilter = questionnaireId
    ? and(
        eq(questionnaries.userId, userId),
        eq(questionnaries.id, questionnaireId),
      )
    : eq(questionnaries.userId, userId);
  const questionRows = await db
    .select({
      id: questions.id,
      questionText: questions.questionText,
      questionType: questions.questionType,
      questionnaryId: questions.questionnaryId,
    })
    .from(questions)
    .innerJoin(
      questionnaries,
      eq(questions.questionnaryId, questionnaries.id),
    )
    .where(ownedQuestionFilter)
    .orderBy(asc(questions.id));

  const alternativeRows = await db
    .select({
      id: questionAlternatives.id,
      alternative: questionAlternatives.alternative,
      questionId: questionAlternatives.questionId,
    })
    .from(questionAlternatives)
    .innerJoin(questions, eq(questionAlternatives.questionId, questions.id))
    .innerJoin(
      questionnaries,
      eq(questions.questionnaryId, questionnaries.id),
    )
    .where(ownedQuestionFilter)
    .orderBy(asc(questionAlternatives.id));

  const alternativesByQuestion = new Map<number, AlternativeDto[]>();
  for (const alternative of alternativeRows) {
    // `question_id` is a nullable column, so Drizzle types it as such even
    // though the inner join above guarantees a value here.
    if (alternative.questionId === null) continue;
    const values = alternativesByQuestion.get(alternative.questionId) ?? [];
    values.push({ id: alternative.id, alternative: alternative.alternative });
    alternativesByQuestion.set(alternative.questionId, values);
  }

  const questionsByQuestionnaire = new Map<number, QuestionDto[]>();
  for (const question of questionRows) {
    const values = questionsByQuestionnaire.get(question.questionnaryId) ?? [];
    values.push({
      ...question,
      alternatives: alternativesByQuestion.get(question.id) ?? [],
    });
    questionsByQuestionnaire.set(question.questionnaryId, values);
  }

  return questionnaireRows.map((questionnaire) => ({
    ...questionnaire,
    questions: questionsByQuestionnaire.get(questionnaire.id) ?? [],
  }));
}

export async function insertQuestion(
  tx: Transaction,
  questionnaryId: number,
  question: {
    questionText: string;
    questionType: 1 | 2 | 3;
    alternatives: Array<{ alternative: string }>;
  },
): Promise<number> {
  const [created] = await tx
    .insert(questions)
    .values({
      questionnaryId,
      questionText: question.questionText,
      questionType: question.questionType,
    })
    .returning({ id: questions.id });

  if (question.alternatives.length > 0) {
    await tx.insert(questionAlternatives).values(
      question.alternatives.map((alternative) => ({
        questionId: created.id,
        alternative: alternative.alternative,
      })),
    );
  }

  return created.id;
}

/**
 * Loads one question with its alternatives, scoped to the owning user through
 * the questionnaire. Cheaper than filtering the output of
 * `loadQuestionnaires`, which would read the user's entire question set.
 */
export async function loadQuestion(
  userId: string,
  questionId: number,
): Promise<QuestionDto | undefined> {
  const db = getDb();
  const [question] = await db
    .select({
      id: questions.id,
      questionText: questions.questionText,
      questionType: questions.questionType,
      questionnaryId: questions.questionnaryId,
    })
    .from(questions)
    .innerJoin(questionnaries, eq(questions.questionnaryId, questionnaries.id))
    .where(and(eq(questions.id, questionId), eq(questionnaries.userId, userId)))
    .limit(1);

  if (!question) return undefined;

  const alternatives = await db
    .select({
      id: questionAlternatives.id,
      alternative: questionAlternatives.alternative,
    })
    .from(questionAlternatives)
    .where(eq(questionAlternatives.questionId, questionId))
    .orderBy(asc(questionAlternatives.id));

  return { ...question, alternatives };
}
