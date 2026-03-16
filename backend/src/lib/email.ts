import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || "no-reply@example.com";

const isConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

export async function sendEmailVerification(to: string, verifyUrl: string) {
  if (!isConfigured || !transporter) {
    console.warn(
      "SMTP is not fully configured. Skipping actual email send. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM."
    );
    console.log(`Email verification link for ${to}: ${verifyUrl}`);
    return;
  }

  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject: "Verify your email address",
    text: `Welcome! Please verify your email by clicking this link: ${verifyUrl}`,
    html: `<p>Welcome!</p>
<p>Please verify your email by clicking the link below:</p>
<p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });
}

