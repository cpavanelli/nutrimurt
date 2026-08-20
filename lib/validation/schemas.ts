import { z } from "zod";

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
