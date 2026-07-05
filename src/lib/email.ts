import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:  "smtp.gmail.com",
  port:  587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const fromName = process.env.EMAIL_FROM_NAME || "Arbitrary";
  const replyToAddress = process.env.EMAIL_REPLY_TO || fromAddress;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !fromAddress) {
    console.error("Email sending failed: missing EMAIL_USER/EMAIL_PASS/EMAIL_FROM config");
    return false;
  }

  const listUnsubscribeUrl = process.env.EMAIL_LIST_UNSUBSCRIBE_URL;
  const listUnsubscribeMailto = process.env.EMAIL_LIST_UNSUBSCRIBE_MAILTO;
  const listUnsubscribe = [
    listUnsubscribeUrl ? `<${listUnsubscribeUrl}>` : null,
    listUnsubscribeMailto ? `<mailto:${listUnsubscribeMailto}>` : null,
  ]
    .filter(Boolean)
    .join(", ");

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      replyTo: replyToAddress,
      to,
      subject,
      html,
      text: text || htmlToText(html),
      headers: {
        ...(listUnsubscribe
          ? {
              "List-Unsubscribe": listUnsubscribe,
              ...(listUnsubscribeUrl
                ? { "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
                : {}),
            }
          : {}),
      },
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("Email accepted by SMTP:", info.accepted);
    }
    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    return false;
  }
}
