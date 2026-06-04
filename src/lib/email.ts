import { Resend } from "resend";

let resend: Resend | null = null;
try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
} catch {
  console.warn("Failed to initialize Resend");
}

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — email not sent", { to, subject });
    return false;
  }

  try {
    await resend.emails.send({
      from: "Arbitary <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Error sending email via Resend:", error);
    return false;
  }
}
