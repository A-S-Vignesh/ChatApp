import { Resend } from "resend";

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail({ to, subject, text }: SendEmailParams) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  try {
    await resend.emails.send({
      from: "AetherChat <noreply@aetherchat.com>",
      to,
      subject,
      text,
    });
  } catch (error) {
    console.error("❌ Email send failed:", error);
    throw new Error("Failed to send email");
  }
}
