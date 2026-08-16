import {
  boolean,
  char,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export type PatientLinkType = 1 | 2;
export type QuestionType = 1 | 2 | 3;
export type MealType = 1 | 2 | 3 | 4 | 5;

// Deliberate divergence from the EF-created schema: `name` and `email` were
// plain `text` there, because the [MaxLength(200)] / [MaxLength(255)]
// annotations on the .NET model were never migrated. We start from a fresh
// database (FRD D4), so enforcing what the model always intended costs nothing.
// Every other length constraint below matches EF exactly.
export const patients = pgTable(
  "patients",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    userId: text("user_id").notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: text("phone").notNull(),
    cpf: text("cpf").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    birth: date("birth", { mode: "string" }),
    weight: integer("weight").notNull(),
    height: integer("height").notNull(),
  },
  (table) => [index("ix_patients_user_id").on(table.userId)],
);

export const questionnaries = pgTable(
  "questionnaries",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
  },
  (table) => [index("ix_questionnaries_user_id").on(table.userId)],
);

export const questions = pgTable(
  "questions",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    questionText: varchar("question_text", { length: 500 }).notNull(),
    questionType: integer("question_type").$type<QuestionType>().notNull(),
    questionnaryId: integer("questionnary_id")
      .notNull()
      .references(() => questionnaries.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("ix_questions_questionnary_id").on(table.questionnaryId),
  ],
);

export const questionAlternatives = pgTable(
  "question_alternatives",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    alternative: varchar("alternative", { length: 500 }).notNull(),
    questionId: integer("question_id").references(() => questions.id),
  },
  (table) => [
    index("ix_question_alternatives_question_id").on(table.questionId),
  ],
);

export const patientDiaries = pgTable("patient_diaries", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: text("name").notNull(),
});

export const patientDiaryEntries = pgTable(
  "patient_diary_entries",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    patientDiaryId: integer("patient_diary_id").references(
      () => patientDiaries.id,
    ),
    date: date("date", { mode: "string" }).notNull(),
    mealType: integer("meal_type").$type<MealType>().notNull(),
    time: timestamp("time", { withTimezone: true }),
    food: text("food").notNull(),
    amount: text("amount").notNull(),
  },
  (table) => [
    index("ix_patient_diary_entries_patient_diary_id").on(
      table.patientDiaryId,
    ),
  ],
);

export const patientLinks = pgTable(
  "patient_links",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    userId: text("user_id").notNull(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    urlId: char("url_id", { length: 32 }).notNull(),
    type: integer("type").$type<PatientLinkType>().notNull(),
    questionnaryId: integer("questionnary_id").references(
      () => questionnaries.id,
    ),
    diaryId: integer("diary_id").references(() => patientDiaries.id),
    lastAnswered: timestamp("last_answered", { withTimezone: true }),
  },
  (table) => [
    index("ix_patient_links_diary_id").on(table.diaryId),
    index("ix_patient_links_patient_id").on(table.patientId),
    index("ix_patient_links_questionnary_id").on(table.questionnaryId),
    index("ix_patient_links_user_id").on(table.userId),
  ],
);

export const patientQuestionAnswers = pgTable(
  "patient_question_answers",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    questionId: integer("question_id").notNull(),
    answer: text("answer").notNull(),
    patientLinkId: integer("patient_link_id")
      .notNull()
      .references(() => patientLinks.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("ix_patient_question_answers_patient_link_id").on(
      table.patientLinkId,
    ),
  ],
);

export const patientQuestionAnswerAlternatives = pgTable(
  "patient_question_answer_alternatives",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    questionId: integer("question_id").notNull(),
    alternative: text("alternative").notNull(),
    patientLinkId: integer("patient_link_id")
      .notNull()
      .references(() => patientLinks.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("ix_patient_question_answer_alternatives_patient_link_id").on(
      table.patientLinkId,
    ),
  ],
);

export const patientMealPlans = pgTable(
  "patient_meal_plans",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    userId: text("user_id").notNull(),
    patientId: integer("patient_id").notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    totalCals: integer("total_cals").notNull(),
    mealPlanDate: date("meal_plan_date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("ix_patient_meal_plans_user_id").on(table.userId)],
);

export const patientMealPlanEntries = pgTable(
  "patient_meal_plan_entries",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    patientMealPlanId: integer("patient_meal_plan_id")
      .notNull()
      .references(() => patientMealPlans.id, { onDelete: "cascade" }),
    mealType: integer("meal_type").$type<MealType>().notNull(),
    food: varchar("food", { length: 100 }).notNull(),
    amount: varchar("amount", { length: 50 }).notNull(),
    substitution: boolean("substitution").notNull(),
    substitution2: boolean("substitution2").notNull(),
  },
  (table) => [
    index("ix_patient_meal_plan_entries_patient_meal_plan_id").on(
      table.patientMealPlanId,
    ),
  ],
);

export const userEmailSendCounters = pgTable(
  "user_email_send_counters",
  {
    userId: text("user_id").primaryKey(),
    windowDate: date("window_date", { mode: "string" }).notNull(),
    sendCount: integer("send_count").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
);
