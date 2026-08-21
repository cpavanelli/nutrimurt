import { z } from "zod";

import { guardrails } from "@/lib/guardrails";
import { URL_ID_PATTERN } from "@/lib/url-id";

import { isValidCpf } from "./cpf";

const id = z.number().int().nonnegative();
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
    message: "Informe uma data válida.",
  });

export const routeIdSchema = z
  .string()
  .regex(/^\d+$/, "ID inválido.")
  .transform(Number)
  .refine((value) => value > 0, "ID inválido.");

export const urlIdSchema = z
  .string()
  .regex(URL_ID_PATTERN, "Link inválido.");

export const patientInputSchema = z.object({
  name: z.string().trim().min(1, "O nome é obrigatório.").max(200),
  email: z.string().trim().email("Informe um e-mail válido.").max(255),
  phone: z
    .string()
    .regex(
      /^\(\d{2}\)\d{5}-\d{4}$/,
      "O telefone deve estar no formato (11)11111-1111",
    ),
  cpf: z.string().refine(isValidCpf, "CPF inválido."),
  birth: dateOnly.nullish(),
  weight: z.number().int(),
  height: z.number().int(),
});

export const patientUpdateSchema = patientInputSchema.extend({
  id: z.number().int().positive(),
});

export const patientIncludeSchema = z.object({
  include: z.literal("all").optional(),
});

export const alternativeInputSchema = z.object({
  id: id.optional(),
  alternative: z.string().trim().min(1, "A alternativa é obrigatória.").max(500),
});

export const nestedQuestionInputSchema = z.object({
  id: id.optional(),
  questionText: z.string().trim().min(1, "A pergunta é obrigatória.").max(500),
  questionType: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  alternatives: z.array(alternativeInputSchema).optional().default([]),
});

export const questionnaireInputSchema = z.object({
  name: z.string().trim().min(1, "O nome é obrigatório."),
  questions: z.array(nestedQuestionInputSchema).optional().default([]),
});

export const questionnaireUpdateSchema = questionnaireInputSchema.extend({
  id: z.number().int().positive(),
});

export const questionInputSchema = nestedQuestionInputSchema.extend({
  questionnaryId: z.number().int().positive(),
});

export const questionUpdateSchema = questionInputSchema.extend({
  id: z.number().int().positive(),
});

const mealType = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

/**
 * Mirrors SendPatientLinkRequest. The conditional rules come from
 * PatientLinksController: a questionnaire link needs a questionnaire, a diary
 * link needs a name. Messages are reproduced verbatim, accents included.
 */
export const sendPatientLinkSchema = z
  .object({
    type: z.union([z.literal(1), z.literal(2)]),
    questionnaryId: z.number().int().nullish(),
    diaryName: z.string().trim().nullish(),
  })
  .superRefine((value, ctx) => {
    if (
      value.type === 1 &&
      !(value.questionnaryId && value.questionnaryId > 0)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["questionnaryId"],
        message: "Escolha um questionario.",
      });
    }

    if (value.type === 2 && !value.diaryName) {
      ctx.addIssue({
        code: "custom",
        path: ["diaryName"],
        message: "Escolha um nome para o diario.",
      });
    }
  });

/**
 * Patient submissions. Note what is absent: no link id, no diary id, no urlId.
 * The route resolves the target from the path, so a body cannot name another
 * link.
 */
export const submittedQuestionSchema = z.object({
  id: z.number().int().positive(),
  questionType: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  answer: z
    .object({ answer: z.string().max(guardrails.maxTextLength).nullish() })
    .nullish(),
  answerAlternatives: z
    .array(z.string().max(guardrails.maxTextLength))
    .optional()
    .default([]),
});

export const patientAnswersSchema = z.object({
  questions: z.array(submittedQuestionSchema),
});

export const submittedDiaryEntrySchema = z.object({
  date: dateOnly,
  mealType,
  time: z
    .string()
    .regex(
      /^(\d{2}:\d{2}|\d{4}-\d{2}-\d{2}T.+)$/,
      "Informe um horário válido.",
    )
    .nullish(),
  food: z.string().max(guardrails.maxTextLength),
  amount: z.string().max(200),
});

export const patientDiarySchema = z.object({
  entries: z.array(submittedDiaryEntrySchema),
});

export const mealPlanEntryInputSchema = z.object({
  mealType,
  food: z.string().trim().min(1, "O alimento é obrigatório.").max(100),
  amount: z.string().trim().max(50),
  substitution: z.boolean(),
  substitution2: z.boolean(),
});

/**
 * The SPA posts `{ ...payload, id: 0 }` on create and `{ ...payload, id }` on
 * update, so `id` is accepted and ignored on create.
 */
export const mealPlanInputSchema = z.object({
  id: z.number().int().nonnegative().optional(),
  patientId: z.number().int().positive(),
  name: z.string().trim().min(1, "O nome é obrigatório.").max(200),
  totalCals: z.number().int(),
  mealPlanDate: dateOnly,
  entries: z.array(mealPlanEntryInputSchema).optional().default([]),
});
