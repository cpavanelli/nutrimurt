/**
 * Mailgun over `fetch`, replacing `app/email/emailsender.py`. Same endpoint,
 * same Basic `api:{key}` auth, same form-encoded body.
 */

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Mailgun configuration missing.");
    this.name = "EmailNotConfiguredError";
  }
}

export class EmailSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailSendError";
  }
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Real mail is only sent when `EMAIL_SEND_ENABLED` is `"true"`. Every Vercel
 * environment currently shares one `DATABASE_URL`, so a preview deploy reads
 * real patients and would otherwise mail them for real — and unlike a row we
 * can delete, a delivered email cannot be taken back. It would also consume
 * the sender's daily quota. Preview and development therefore log instead.
 *
 * The quota slot is still reserved either way, so the guardrail behaves
 * identically in every environment.
 */
function sendingEnabled(): boolean {
  return process.env.EMAIL_SEND_ENABLED === "true";
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const from = process.env.MAILGUN_FROM;

  if (!sendingEnabled()) {
    console.info(
      `[email] suppressed (EMAIL_SEND_ENABLED is not "true") to=${message.to} subject=${message.subject}`,
    );
    return;
  }

  if (!apiKey || !domain || !from) {
    throw new EmailNotConfiguredError();
  }

  const body = new URLSearchParams({
    from,
    to: message.to,
    subject: message.subject,
    text: message.text,
  });

  if (message.html) {
    body.set("html", message.html);
  }

  let response: Response;

  try {
    response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new EmailSendError(
      `Mailgun request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    throw new EmailSendError(
      `Mailgun rejected the request with ${response.status}.`,
    );
  }
}
