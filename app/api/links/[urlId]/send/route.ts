import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { conflict, notFound, parseUrlId, withApiHandler } from "@/lib/api/handler";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import {
  EmailNotConfiguredError,
  EmailSendError,
  sendEmail,
} from "@/lib/email";
import {
  emailQuotaMessage,
  reserveEmailSendSlot,
} from "@/lib/services/email-quota";
import { findLinkByUrlId, linkBelongsTo } from "@/lib/services/answers";

interface RouteContext {
  params: Promise<{ urlId: string }>;
}

/**
 * Replaces `POST /py/sendEmail/{urlID}`. Message wording, subject and link
 * format are reproduced from `main.py` so the patient-facing email is
 * unchanged.
 */
export const POST = withApiHandler(
  async (_request: Request, { params }: RouteContext) => {
    const userId = await requireUserId();
    const parsed = parseUrlId((await params).urlId);
    if (!parsed.success) return parsed.response;

    const link = await findLinkByUrlId(parsed.data);
    if (!link || !linkBelongsTo(link, userId)) return notFound();

    const [patient] = await getDb()
      .select({ name: patients.name, email: patients.email })
      .from(patients)
      .where(eq(patients.id, link.patientId));

    if (!patient) return notFound();

    // Reserved before sending, exactly as the Python version did. A send that
    // then fails still consumes the slot; that is existing behaviour and it
    // fails closed.
    if (!(await reserveEmailSendSlot(userId))) {
      return conflict(emailQuotaMessage);
    }

    // FRD §6: NEXT_PUBLIC_APP_URL replaces the Python service's WEBSITE_URL.
    const websiteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const noun = link.type === 1 ? "questionário" : "diário";
    const subject =
      link.type === 1 ? "Questionário NutriMurt" : "Diário NutriMurt";
    const href = `${websiteUrl}/answer/${link.urlId}`;

    try {
      await sendEmail({
        to: patient.email,
        subject,
        text: `Ola ${patient.name}! Acesse o link para preencher seu ${noun}: ${href}`,
        html: `<p>Ola ${patient.name}! Acesse o link para preencher seu ${noun}: <a href="${href}">Clique aqui</a></p>`,
      });
    } catch (error) {
      if (error instanceof EmailNotConfiguredError) {
        return NextResponse.json(
          { detail: "Serviço de e-mail indisponível." },
          { status: 502 },
        );
      }

      if (error instanceof EmailSendError) {
        return NextResponse.json(
          { detail: "Falha ao enviar e-mail pelo provedor." },
          { status: 502 },
        );
      }

      throw error;
    }

    return NextResponse.json({ status: "ok" });
  },
);
