import { and, asc, eq } from "drizzle-orm";

import { getDb, withTransaction } from "@/lib/db";
import {
  type MealType,
  patientDiaries,
  patientDiaryEntries,
  patientLinks,
  patientQuestionAnswerAlternatives,
  patientQuestionAnswers,
  patients,
  questionAlternatives,
  questionnaries,
  questions,
} from "@/lib/db/schema";
import { guardrails } from "@/lib/guardrails";

/**
 * Port of `app/services/answers.py`. Field names reproduce the Python wire
 * shape exactly, mixed casing included (`patient_id` beside `urlId`), because
 * the React SPA consumes these responses until PR 6 replaces it.
 */

export interface AnswerAlternativeDto {
  id: number;
  alternative: string;
}

export interface QuestionAnswerDto {
  id: number | null;
  answer: string;
}

export interface AnswerQuestionDto {
  id: number;
  questionText: string;
  questionType: number;
  alternatives: AnswerAlternativeDto[];
  answer?: QuestionAnswerDto;
  answerAlternatives: string[];
}

export interface QuestionaryDto {
  id: number;
  name: string;
  questions: AnswerQuestionDto[];
}

export interface DiaryEntryDto {
  id: number | null;
  date: string;
  mealType: number;
  time: string | null;
  food: string;
  amount: string;
}

export interface DiaryDto {
  id: number;
  name: string;
  entries: DiaryEntryDto[];
}

export interface PatientLinkDto {
  id: number;
  urlId: string;
  patient_id: number | null;
  questionnary_id: number | null;
  diary_id: number | null;
  type: number;
  last_answered: string | null;
  patient: { id: number | null; name: string; email: string | null };
  questionnary: QuestionaryDto | null;
  diary: DiaryDto | null;
}

export interface PublicPatientLinkDto {
  id: number;
  urlId: string;
  type: number;
  last_answered: string | null;
  patient: { name: string };
  questionnary: QuestionaryDto | null;
  diary: DiaryDto | null;
}

export interface LinkRow {
  id: number;
  userId: string;
  patientId: number;
  urlId: string;
  type: number;
  questionnaryId: number | null;
  diaryId: number | null;
  lastAnswered: Date | null;
}

export type SaveResult = { ok: true } | { ok: false; detail: string };

/**
 * Resolves a link from its `urlId` alone. Every caller keys off the row this
 * returns rather than off anything in the request body — see
 * `savePatientAnswers` for why that matters.
 */
export async function findLinkByUrlId(urlId: string): Promise<LinkRow | null> {
  const [link] = await getDb()
    .select({
      id: patientLinks.id,
      userId: patientLinks.userId,
      patientId: patientLinks.patientId,
      urlId: patientLinks.urlId,
      type: patientLinks.type,
      questionnaryId: patientLinks.questionnaryId,
      diaryId: patientLinks.diaryId,
      lastAnswered: patientLinks.lastAnswered,
    })
    .from(patientLinks)
    .where(eq(patientLinks.urlId, urlId));

  return link ?? null;
}

/**
 * The diary `time` column is `timestamptz`, but the value it holds is a
 * wall-clock label the patient typed, not an instant. The Python original
 * wrote a naive `datetime` through a session pinned to UTC and read it back
 * with `strftime("%H:%M")`, so "08:30" round-tripped unchanged. We reproduce
 * that by anchoring at UTC on the way in and reading UTC on the way out.
 *
 * Do not route this through `formatDateTime` — that renders America/Sao_Paulo
 * and would turn 08:30 into 05:30.
 */
function toEntryTimestamp(date: string, time: string | null): Date | null {
  if (!time) return null;

  if (time.includes("T")) {
    // The diary form sends `2026-03-10T08:30:00` — no offset. Python parsed
    // that with `fromisoformat` into a naive datetime and wrote it through a
    // UTC session, so it must be anchored at UTC here too. Letting `new Date`
    // apply the runtime zone would shift every entry the moment the server TZ
    // is not UTC.
    const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(time);
    return new Date(hasZone ? time.replace("Z", "+00:00") : `${time}Z`);
  }

  return new Date(`${date}T${time}:00Z`);
}

function fromEntryTimestamp(value: Date | null): string | null {
  return value ? value.toISOString().slice(11, 16) : null;
}

async function loadPatient(patientId: number) {
  const [patient] = await getDb()
    .select({
      id: patients.id,
      name: patients.name,
      email: patients.email,
    })
    .from(patients)
    .where(eq(patients.id, patientId));

  return patient ?? null;
}

async function loadQuestionary(link: LinkRow): Promise<QuestionaryDto | null> {
  if (!link.questionnaryId) return null;

  const db = getDb();

  const [questionary] = await db
    .select({ id: questionnaries.id, name: questionnaries.name })
    .from(questionnaries)
    .where(eq(questionnaries.id, link.questionnaryId));

  if (!questionary) return null;

  const questionRows = await db
    .select({
      id: questions.id,
      questionText: questions.questionText,
      questionType: questions.questionType,
    })
    .from(questions)
    .where(eq(questions.questionnaryId, questionary.id))
    .orderBy(asc(questions.id));

  const alternativeRows = await db
    .select({
      id: questionAlternatives.id,
      questionId: questionAlternatives.questionId,
      alternative: questionAlternatives.alternative,
    })
    .from(questionAlternatives)
    .innerJoin(questions, eq(questions.id, questionAlternatives.questionId))
    .where(eq(questions.questionnaryId, questionary.id))
    .orderBy(asc(questionAlternatives.id));

  const answerRows = await db
    .select({
      id: patientQuestionAnswers.id,
      questionId: patientQuestionAnswers.questionId,
      answer: patientQuestionAnswers.answer,
    })
    .from(patientQuestionAnswers)
    .where(eq(patientQuestionAnswers.patientLinkId, link.id));

  const selectedRows = await db
    .select({
      questionId: patientQuestionAnswerAlternatives.questionId,
      alternative: patientQuestionAnswerAlternatives.alternative,
    })
    .from(patientQuestionAnswerAlternatives)
    .where(eq(patientQuestionAnswerAlternatives.patientLinkId, link.id))
    .orderBy(asc(patientQuestionAnswerAlternatives.id));

  const alternativesByQuestion = new Map<number, AnswerAlternativeDto[]>();
  for (const row of alternativeRows) {
    // question_alternatives.question_id is nullable in the schema; an orphan
    // alternative belongs to no question and is dropped rather than grouped.
    if (row.questionId === null) continue;
    const bucket = alternativesByQuestion.get(row.questionId) ?? [];
    bucket.push({ id: row.id, alternative: row.alternative });
    alternativesByQuestion.set(row.questionId, bucket);
  }

  const answersByQuestion = new Map(
    answerRows.map((row) => [row.questionId, row]),
  );

  const selectedByQuestion = new Map<number, string[]>();
  for (const row of selectedRows) {
    const bucket = selectedByQuestion.get(row.questionId) ?? [];
    bucket.push(row.alternative);
    selectedByQuestion.set(row.questionId, bucket);
  }

  return {
    id: questionary.id,
    name: questionary.name,
    questions: questionRows.map((question) => {
      const dto: AnswerQuestionDto = {
        id: question.id,
        questionText: question.questionText,
        questionType: question.questionType,
        alternatives: alternativesByQuestion.get(question.id) ?? [],
        answerAlternatives: selectedByQuestion.get(question.id) ?? [],
      };

      // Type 3 is multiple choice; its answer lives in answerAlternatives.
      if (question.questionType !== 3) {
        const saved = answersByQuestion.get(question.id);
        dto.answer = { id: saved?.id ?? null, answer: saved?.answer ?? "" };
      }

      return dto;
    }),
  };
}

async function loadDiary(link: LinkRow): Promise<DiaryDto | null> {
  if (!link.diaryId) return null;

  const db = getDb();

  const [diary] = await db
    .select({ id: patientDiaries.id, name: patientDiaries.name })
    .from(patientDiaries)
    .where(eq(patientDiaries.id, link.diaryId));

  if (!diary) return null;

  // Matches the Python sort: date, then meal, then time with untimed entries
  // last. Postgres orders NULLs last on ASC by default.
  const entries = await db
    .select({
      id: patientDiaryEntries.id,
      date: patientDiaryEntries.date,
      mealType: patientDiaryEntries.mealType,
      time: patientDiaryEntries.time,
      food: patientDiaryEntries.food,
      amount: patientDiaryEntries.amount,
    })
    .from(patientDiaryEntries)
    .where(eq(patientDiaryEntries.patientDiaryId, diary.id))
    .orderBy(
      asc(patientDiaryEntries.date),
      asc(patientDiaryEntries.mealType),
      asc(patientDiaryEntries.time),
    );

  return {
    id: diary.id,
    name: diary.name,
    entries: entries.map((entry) => ({
      id: entry.id,
      date: entry.date,
      mealType: entry.mealType,
      time: fromEntryTimestamp(entry.time),
      food: entry.food,
      amount: entry.amount,
    })),
  };
}

/** Full payload, including patient email. Staff routes only. */
export async function buildPatientLink(
  link: LinkRow,
): Promise<PatientLinkDto | null> {
  const patient = await loadPatient(link.patientId);
  if (!patient) return null;

  const questionary = link.type === 1 ? await loadQuestionary(link) : null;
  const diary = link.type === 2 ? await loadDiary(link) : null;

  if (link.type === 1 && !questionary) return null;
  if (link.type === 2 && !diary) return null;

  return {
    id: link.id,
    urlId: link.urlId,
    patient_id: link.patientId,
    questionnary_id: link.questionnaryId,
    diary_id: link.diaryId,
    type: link.type,
    last_answered: link.lastAnswered?.toISOString() ?? null,
    patient: { id: patient.id, name: patient.name, email: patient.email },
    questionnary: questionary,
    diary,
  };
}

/**
 * Strips the payload down for unauthenticated patients. `patient.name` is the
 * only field about the patient that survives — notably not `email`, and not
 * `patient_id`.
 */
export function toPublicPatientLink(
  link: PatientLinkDto,
): PublicPatientLinkDto {
  return {
    id: link.id,
    urlId: link.urlId,
    type: link.type,
    last_answered: link.last_answered,
    patient: { name: link.patient.name },
    questionnary: link.questionnary,
    diary: link.diary,
  };
}

export interface SubmittedQuestion {
  id: number;
  questionType: number;
  answer?: { answer?: string | null } | null;
  answerAlternatives?: string[];
}

/**
 * Replaces every answer on a link.
 *
 * The Python original looked the link up by `urlId` to prove it existed, then
 * wrote using the `id` and `diary_id` carried in the request body. Because the
 * two were never compared, an unauthenticated caller holding any one valid
 * `urlId` could delete and overwrite a different patient's answers by naming
 * their link id. `link` here is always the row resolved from the path's
 * `urlId`, and nothing about identity is read from the body.
 */
export async function savePatientAnswers(
  link: LinkRow,
  submitted: SubmittedQuestion[],
): Promise<SaveResult> {
  if (submitted.length > guardrails.maxQuestionsPerSubmission) {
    return { ok: false, detail: "Payload exceeds question limit." };
  }

  for (const question of submitted) {
    const selected = question.answerAlternatives ?? [];
    if (selected.length > guardrails.maxAnswerAlternativesPerQuestion) {
      return { ok: false, detail: "Too many alternative selections." };
    }
  }

  const answerRows = submitted
    .filter((question) => question.questionType !== 3)
    .map((question) => ({
      patientLinkId: link.id,
      questionId: question.id,
      answer: question.answer?.answer ?? "",
    }));

  const alternativeRows = submitted
    .filter((question) => question.questionType === 3)
    .flatMap((question) =>
      (question.answerAlternatives ?? []).map((alternative) => ({
        patientLinkId: link.id,
        questionId: question.id,
        alternative,
      })),
    );

  // The Python version deleted and inserted across separate commits, so a
  // failure between them left the patient's answers destroyed. One
  // transaction here.
  await withTransaction(async (tx) => {
    await tx
      .delete(patientQuestionAnswerAlternatives)
      .where(eq(patientQuestionAnswerAlternatives.patientLinkId, link.id));
    await tx
      .delete(patientQuestionAnswers)
      .where(eq(patientQuestionAnswers.patientLinkId, link.id));

    if (answerRows.length > 0) {
      await tx.insert(patientQuestionAnswers).values(answerRows);
    }
    if (alternativeRows.length > 0) {
      await tx.insert(patientQuestionAnswerAlternatives).values(alternativeRows);
    }

    await tx
      .update(patientLinks)
      .set({ lastAnswered: new Date() })
      .where(eq(patientLinks.id, link.id));
  });

  return { ok: true };
}

export interface SubmittedDiaryEntry {
  date: string;
  mealType: MealType;
  time?: string | null;
  food: string;
  amount: string;
}

/** Replaces every diary entry on a link. Same identity rule as above. */
export async function savePatientDiary(
  link: LinkRow,
  submitted: SubmittedDiaryEntry[],
): Promise<SaveResult> {
  if (submitted.length > guardrails.maxTotalDiaryEntries) {
    return {
      ok: false,
      detail: "Você atingiu o número máximo de entradas no diário.",
    };
  }

  const perDay = new Map<string, number>();
  for (const entry of submitted) {
    perDay.set(entry.date, (perDay.get(entry.date) ?? 0) + 1);
  }

  if (perDay.size > guardrails.maxDiaryDistinctDays) {
    return {
      ok: false,
      detail: "Você atingiu o número máximo de dias no diário.",
    };
  }

  for (const count of perDay.values()) {
    if (count > guardrails.maxDiaryEntriesPerDay) {
      return {
        ok: false,
        detail: "Você atingiu o número máximo de entradas por dia.",
      };
    }
  }

  const diaryId = link.diaryId;
  if (!diaryId) {
    return { ok: false, detail: "Link não possui um diário." };
  }

  const rows = submitted.map((entry) => ({
    patientDiaryId: diaryId,
    date: entry.date,
    mealType: entry.mealType,
    time: toEntryTimestamp(entry.date, entry.time ?? null),
    food: entry.food,
    amount: entry.amount,
  }));

  await withTransaction(async (tx) => {
    await tx
      .delete(patientDiaryEntries)
      .where(eq(patientDiaryEntries.patientDiaryId, diaryId));

    if (rows.length > 0) {
      await tx.insert(patientDiaryEntries).values(rows);
    }

    await tx
      .update(patientLinks)
      .set({ lastAnswered: new Date() })
      .where(eq(patientLinks.id, link.id));
  });

  return { ok: true };
}

/** Guards staff routes: a link belongs to exactly one user. */
export function linkBelongsTo(link: LinkRow, userId: string): boolean {
  return link.userId === userId;
}

export const linkFilterForUser = (urlId: string, userId: string) =>
  and(eq(patientLinks.urlId, urlId), eq(patientLinks.userId, userId));
