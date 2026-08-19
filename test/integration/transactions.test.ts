import { describe, expect, it } from "vitest";

import { getDb, withTransaction } from "@/lib/db";
import { questionAlternatives, questionnaries, questions } from "@/lib/db/schema";

import { USER_A } from "./session";

/**
 * These pin the contract the questionnaire and question routes rely on:
 * `withTransaction` is a rollback boundary, so a mutation that fails part-way
 * leaves nothing behind.
 *
 * Note what this does and does not prove. The integration suite swaps in
 * node-postgres, so these exercise the *seam* — that the routes are written
 * against a transactional API and that a provider must honour rollback. They
 * do not exercise Neon's WebSocket driver, which only a preview deploy can
 * cover.
 */
describe("withTransaction", () => {
  it("rolls back every statement when the callback throws", async () => {
    await expect(
      withTransaction(async (tx) => {
        const [created] = await tx
          .insert(questionnaries)
          .values({ userId: USER_A, name: "Doomed" })
          .returning({ id: questionnaries.id });

        await tx
          .insert(questions)
          .values({
            questionnaryId: created.id,
            questionText: "Nunca persistida",
            questionType: 1,
          });

        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(await getDb().select().from(questionnaries)).toEqual([]);
    expect(await getDb().select().from(questions)).toEqual([]);
  });

  it("commits every statement when the callback returns", async () => {
    const id = await withTransaction(async (tx) => {
      const [created] = await tx
        .insert(questionnaries)
        .values({ userId: USER_A, name: "Persistida" })
        .returning({ id: questionnaries.id });

      const [question] = await tx
        .insert(questions)
        .values({
          questionnaryId: created.id,
          questionText: "Persistida",
          questionType: 3,
        })
        .returning({ id: questions.id });

      await tx
        .insert(questionAlternatives)
        .values({ questionId: question.id, alternative: "Sim" });

      return created.id;
    });

    expect(await getDb().select().from(questionnaries)).toHaveLength(1);
    expect(await getDb().select().from(questions)).toHaveLength(1);
    expect(await getDb().select().from(questionAlternatives)).toHaveLength(1);
    expect(id).toBeGreaterThan(0);
  });
});
