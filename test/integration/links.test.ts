import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { GET as getStaffLink } from "@/app/api/links/[urlId]/route";
import { POST as sendLinkEmail } from "@/app/api/links/[urlId]/send/route";
import { DELETE as deleteLink } from "@/app/api/patients/[id]/links/[linkId]/route";
import { GET as listLinks } from "@/app/api/patients/[id]/links/route";
import { POST as createLink } from "@/app/api/patients/[id]/links/send/route";
import { getDb } from "@/lib/db";
import {
  patientDiaries,
  patientDiaryEntries,
  patientLinks,
  patientQuestionAnswers,
  userEmailSendCounters,
} from "@/lib/db/schema";
import { guardrails } from "@/lib/guardrails";
import { generateUrlId } from "@/lib/url-id";

import {
  jsonRequest,
  linkRouteContext,
  routeContext,
  routeUrlIdContext,
  seedDiaryLink,
  seedPatient,
  seedQuestionnaire,
  seedQuestionnaireLink,
} from "./helpers";
import { signInAs, USER_A, USER_B } from "./session";

const anyRequest = () => new Request("https://nutrimurt.test/api");

describe("POST /api/patients/[id]/links/send", () => {
  it("creates a questionnaire link with a 32 hex character urlId", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");
    const questionnaryId = await seedQuestionnaire(USER_A, "Anamnese");

    const response = await createLink(
      jsonRequest({ type: 1, questionnaryId }),
      routeContext(patientId),
    );

    expect(response.status).toBe(200);
    const [link] = await response.json();

    expect(link.urlId).toMatch(/^[0-9a-f]{32}$/);
    expect(link).toMatchObject({
      type: 1,
      questionnaryId,
      diaryId: null,
      questionnaryName: "Anamnese",
      lastAnswered: null,
    });
  });

  it("creates a diary and its link together", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");

    const response = await createLink(
      jsonRequest({ type: 2, diaryName: "Diário de março" }),
      routeContext(patientId),
    );

    expect(response.status).toBe(200);
    const [link] = await response.json();

    expect(link.type).toBe(2);
    expect(link.diaryName).toBe("Diário de março");
    expect(link.questionnaryId).toBeNull();

    const diaries = await getDb().select().from(patientDiaries);
    expect(diaries).toHaveLength(1);
    expect(diaries[0].id).toBe(link.diaryId);
  });

  it("requires a questionnaire for a questionnaire link", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");

    const response = await createLink(
      jsonRequest({ type: 1 }),
      routeContext(patientId),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errors.questionnaryId).toEqual(["Escolha um questionario."]);
  });

  it("requires a name for a diary link", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");

    const response = await createLink(
      jsonRequest({ type: 2 }),
      routeContext(patientId),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errors.diaryName).toEqual(["Escolha um nome para o diario."]);
  });

  it("enforces the per-patient link guardrail", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");
    const questionnaryId = await seedQuestionnaire(USER_A);

    for (let i = 0; i < guardrails.maxLinksPerPatient; i += 1) {
      await seedQuestionnaireLink(USER_A, patientId, questionnaryId);
    }

    const response = await createLink(
      jsonRequest({ type: 1, questionnaryId }),
      routeContext(patientId),
    );

    expect(response.status).toBe(409);
  });

  it("404s for another user's patient", async () => {
    const patientId = await seedPatient(USER_A, "Ana");
    const questionnaryId = await seedQuestionnaire(USER_A);

    signInAs(USER_B);
    const response = await createLink(
      jsonRequest({ type: 1, questionnaryId }),
      routeContext(patientId),
    );

    expect(response.status).toBe(404);
  });
});

describe("GET /api/patients/[id]/links", () => {
  it("lists the patient's links with names resolved", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");
    const questionnaryId = await seedQuestionnaire(USER_A, "Anamnese");
    await seedQuestionnaireLink(USER_A, patientId, questionnaryId);
    await seedDiaryLink(USER_A, patientId, "Diário");

    const response = await listLinks(anyRequest(), routeContext(patientId));
    expect(response.status).toBe(200);

    const links = await response.json();
    expect(links).toHaveLength(2);
    expect(links.map((link: { type: number }) => link.type).sort()).toEqual([
      1, 2,
    ]);
    expect(
      links.find((link: { type: number }) => link.type === 1).questionnaryName,
    ).toBe("Anamnese");
    expect(
      links.find((link: { type: number }) => link.type === 2).diaryName,
    ).toBe("Diário");
  });

  it("404s for another user's patient", async () => {
    const patientId = await seedPatient(USER_A, "Ana");

    signInAs(USER_B);
    const response = await listLinks(anyRequest(), routeContext(patientId));

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/patients/[id]/links/[linkId]", () => {
  it("removes the link and cascades its answers", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");
    const questionnaryId = await seedQuestionnaire(USER_A);
    const link = await seedQuestionnaireLink(
      USER_A,
      patientId,
      questionnaryId,
    );

    await getDb()
      .insert(patientQuestionAnswers)
      .values({ patientLinkId: link.id, questionId: 1, answer: "x" });

    const response = await deleteLink(
      anyRequest(),
      linkRouteContext(patientId, link.id),
    );

    expect(response.status).toBe(204);
    expect(await getDb().select().from(patientLinks)).toHaveLength(0);
    expect(await getDb().select().from(patientQuestionAnswers)).toHaveLength(0);
  });

  it("removes the diary and its entries, which do not cascade", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");
    const link = await seedDiaryLink(USER_A, patientId);

    await getDb().insert(patientDiaryEntries).values({
      patientDiaryId: link.diaryId,
      date: "2026-03-10",
      mealType: 1,
      time: null,
      food: "Aveia",
      amount: "50g",
    });

    const response = await deleteLink(
      anyRequest(),
      linkRouteContext(patientId, link.id),
    );

    expect(response.status).toBe(204);
    expect(await getDb().select().from(patientDiaries)).toHaveLength(0);
    expect(await getDb().select().from(patientDiaryEntries)).toHaveLength(0);
  });

  it("404s for another user's link and leaves it in place", async () => {
    const patientId = await seedPatient(USER_A, "Ana");
    const questionnaryId = await seedQuestionnaire(USER_A);
    const link = await seedQuestionnaireLink(
      USER_A,
      patientId,
      questionnaryId,
    );

    signInAs(USER_B);
    const response = await deleteLink(
      anyRequest(),
      linkRouteContext(patientId, link.id),
    );

    expect(response.status).toBe(404);
    expect(await getDb().select().from(patientLinks)).toHaveLength(1);
  });
});

describe("GET /api/links/[urlId]", () => {
  it("returns the full payload including the patient email", async () => {
    signInAs(USER_A);
    const patientId = await seedPatient(USER_A, "Ana");
    const questionnaryId = await seedQuestionnaire(USER_A, "Anamnese");
    const link = await seedQuestionnaireLink(
      USER_A,
      patientId,
      questionnaryId,
    );

    const response = await getStaffLink(
      anyRequest(),
      routeUrlIdContext(link.urlId),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.patient.email).toBe("ana@example.com");
    expect(body.questionnary.name).toBe("Anamnese");
  });

  it("404s for another user's link", async () => {
    const patientId = await seedPatient(USER_A, "Ana");
    const questionnaryId = await seedQuestionnaire(USER_A);
    const link = await seedQuestionnaireLink(
      USER_A,
      patientId,
      questionnaryId,
    );

    signInAs(USER_B);
    const response = await getStaffLink(
      anyRequest(),
      routeUrlIdContext(link.urlId),
    );

    expect(response.status).toBe(404);
  });
});

describe("POST /api/links/[urlId]/send", () => {
  async function seedLinkFor(userId: string) {
    const patientId = await seedPatient(userId, "Ana");
    const questionnaryId = await seedQuestionnaire(userId);
    return seedQuestionnaireLink(userId, patientId, questionnaryId);
  }

  it("sends and records one against the daily quota", async () => {
    signInAs(USER_A);
    const link = await seedLinkFor(USER_A);

    const response = await sendLinkEmail(
      anyRequest(),
      routeUrlIdContext(link.urlId),
    );

    expect(response.status).toBe(200);

    const [counter] = await getDb()
      .select()
      .from(userEmailSendCounters)
      .where(eq(userEmailSendCounters.userId, USER_A));

    expect(counter.sendCount).toBe(1);
  });

  it("409s once the daily cap is spent, and stops counting there", async () => {
    signInAs(USER_A);
    const link = await seedLinkFor(USER_A);
    const context = () => routeUrlIdContext(link.urlId);

    for (let i = 0; i < guardrails.maxEmailSendsPerDay; i += 1) {
      const response = await sendLinkEmail(anyRequest(), context());
      expect(response.status).toBe(200);
    }

    const rejected = await sendLinkEmail(anyRequest(), context());
    expect(rejected.status).toBe(409);
    expect((await rejected.json()).detail).toContain("limite diário");

    const [counter] = await getDb()
      .select()
      .from(userEmailSendCounters)
      .where(eq(userEmailSendCounters.userId, USER_A));

    // The rejected attempt must not inflate the counter past the cap.
    expect(counter.sendCount).toBe(guardrails.maxEmailSendsPerDay);
  });

  /**
   * R4. On Vercel these run as concurrent invocations sharing no memory, so
   * the reservation has to be decided inside the database. A read-then-write
   * implementation passes the sequential test above and fails this one.
   */
  it("never exceeds the cap under concurrent sends", async () => {
    signInAs(USER_A);
    const link = await seedLinkFor(USER_A);

    const attempts = guardrails.maxEmailSendsPerDay * 2;
    const responses = await Promise.all(
      Array.from({ length: attempts }, () =>
        sendLinkEmail(anyRequest(), routeUrlIdContext(link.urlId)),
      ),
    );

    const accepted = responses.filter((r) => r.status === 200).length;
    const rejected = responses.filter((r) => r.status === 409).length;

    expect(accepted).toBe(guardrails.maxEmailSendsPerDay);
    expect(rejected).toBe(attempts - guardrails.maxEmailSendsPerDay);

    const [counter] = await getDb()
      .select()
      .from(userEmailSendCounters)
      .where(eq(userEmailSendCounters.userId, USER_A));

    expect(counter.sendCount).toBe(guardrails.maxEmailSendsPerDay);
  });

  it("starts a fresh allowance when the UTC window rolls over", async () => {
    signInAs(USER_A);
    const link = await seedLinkFor(USER_A);

    for (let i = 0; i < guardrails.maxEmailSendsPerDay; i += 1) {
      await sendLinkEmail(anyRequest(), routeUrlIdContext(link.urlId));
    }

    // Move the stored window back a day, as if the counter were last touched
    // yesterday.
    await getDb()
      .update(userEmailSendCounters)
      .set({ windowDate: "2020-01-01" })
      .where(eq(userEmailSendCounters.userId, USER_A));

    const response = await sendLinkEmail(
      anyRequest(),
      routeUrlIdContext(link.urlId),
    );

    expect(response.status).toBe(200);

    const [counter] = await getDb()
      .select()
      .from(userEmailSendCounters)
      .where(eq(userEmailSendCounters.userId, USER_A));

    expect(counter.sendCount).toBe(1);
  });

  it("does not spend quota on another user's link", async () => {
    const link = await seedLinkFor(USER_A);

    signInAs(USER_B);
    const response = await sendLinkEmail(
      anyRequest(),
      routeUrlIdContext(link.urlId),
    );

    expect(response.status).toBe(404);
    expect(await getDb().select().from(userEmailSendCounters)).toHaveLength(0);
  });

  it("404s an unknown link", async () => {
    signInAs(USER_A);

    const response = await sendLinkEmail(
      anyRequest(),
      routeUrlIdContext(generateUrlId()),
    );

    expect(response.status).toBe(404);
  });
});
