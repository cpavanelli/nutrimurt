import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/dashboard/route";
import { getDb } from "@/lib/db";
import { patientLinks } from "@/lib/db/schema";

import { seedPatient, seedQuestionnaire } from "./helpers";
import { signInAs, USER_A, USER_B } from "./session";

let urlIdCounter = 0;

async function seedLink(
  userId: string,
  patientId: number,
  type: 1 | 2,
  lastAnswered: Date | null,
  questionnaryId: number | null = null,
) {
  urlIdCounter += 1;
  await getDb()
    .insert(patientLinks)
    .values({
      userId,
      patientId,
      urlId: String(urlIdCounter).padStart(32, "0"),
      type,
      questionnaryId,
      diaryId: null,
      lastAnswered,
    });
}

describe("GET /api/dashboard", () => {
  it("counts only the caller's patients and answered links", async () => {
    const mine = await seedPatient(USER_A, "Mine");
    const theirs = await seedPatient(USER_B, "Theirs");

    await seedLink(USER_A, mine, 1, new Date("2026-03-10T12:00:00Z"));
    await seedLink(USER_A, mine, 2, new Date("2026-03-11T12:00:00Z"));
    await seedLink(USER_A, mine, 1, null); // unanswered, must not count
    await seedLink(USER_B, theirs, 1, new Date("2026-03-12T12:00:00Z"));

    signInAs(USER_A);
    const body = await (await GET()).json();

    expect(body.stats).toEqual({
      activePatients: 1,
      answeredQuestionnaires: 1,
      recordedDiaries: 1,
    });
  });

  it("names the patient and questionnaire on recent links", async () => {
    const patientId = await seedPatient(USER_A, "Ana");
    const questionnaireId = await seedQuestionnaire(USER_A, "Anamnese");
    await seedLink(
      USER_A,
      patientId,
      1,
      new Date("2026-03-10T12:00:00Z"),
      questionnaireId,
    );

    signInAs(USER_A);
    const body = await (await GET()).json();

    expect(body.recentlyAnsweredQuestionnaires[0]).toMatchObject({
      patientName: "Ana",
      questionnaryName: "Anamnese",
    });
  });

  it("orders recent answers newest first and caps them at five", async () => {
    const patientId = await seedPatient(USER_A, "Ana");
    for (let day = 1; day <= 7; day += 1) {
      await seedLink(
        USER_A,
        patientId,
        1,
        new Date(`2026-03-0${day}T12:00:00Z`),
      );
    }

    signInAs(USER_A);
    const body = await (await GET()).json();
    const recent = body.recentlyAnsweredQuestionnaires;

    expect(recent).toHaveLength(5);
    expect(recent[0].lastAnswered).toBe("07/03/2026 09:00");
    expect(recent[4].lastAnswered).toBe("03/03/2026 09:00");
  });

  it("renders lastAnswered in America/Sao_Paulo, not UTC", async () => {
    const patientId = await seedPatient(USER_A, "Ana");
    // The .NET API rendered this instant as "10/03/2026 01:30".
    await seedLink(USER_A, patientId, 1, new Date("2026-03-10T01:30:00Z"));

    signInAs(USER_A);
    const body = await (await GET()).json();

    expect(body.recentlyAnsweredQuestionnaires[0].lastAnswered).toBe(
      "09/03/2026 22:30",
    );
  });

  it("leaks nothing from another user", async () => {
    const theirs = await seedPatient(USER_B, "Theirs");
    await seedLink(USER_B, theirs, 1, new Date("2026-03-10T12:00:00Z"));

    signInAs(USER_A);
    const body = await (await GET()).json();

    expect(body.stats.activePatients).toBe(0);
    expect(body.recentPatients).toEqual([]);
    expect(body.recentlyAnsweredQuestionnaires).toEqual([]);
    expect(body.recentlyAnsweredDiaries).toEqual([]);
  });

  it("returns 401 when unauthenticated", async () => {
    signInAs(null);
    expect((await GET()).status).toBe(401);
  });
});
