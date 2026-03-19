import type { ReactElement } from "react";
import { Resend } from "resend";
import { createLogger } from "./logger";

const log = createLogger("Email");

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.RESEND_FROM_EMAIL ?? "hello@recipefactory.app";

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: ReactElement;
}) {
  if (!resend) {
    log.warn("Resend not configured — skipping email", { to, subject });
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, react });
    log.info("Email sent", { to, subject });
  } catch (err) {
    log.error("Failed to send email", { to, subject }, err);
    // Non-fatal — don't throw
  }
}
