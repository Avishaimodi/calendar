require('dotenv').config();
const nodemailer = require('nodemailer');

const EMAIL_ENABLED = String(process.env.EMAIL_ENABLED).toLowerCase() === 'true';

let transporter = null;
if (EMAIL_ENABLED) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/**
 * Sends an email if EMAIL_ENABLED=true, otherwise just logs to console.
 * Callers are responsible for writing a row to the `emails` table regardless
 * (so the app has a full send log even in stub mode).
 */
async function sendEmail({ to, subject, text }) {
  if (!EMAIL_ENABLED) {
    console.log(`[mailer:stub] would send email to=${to} subject="${subject}"`);
    return { stubbed: true };
  }

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
  });
  return { stubbed: false, messageId: info.messageId };
}

module.exports = { sendEmail, EMAIL_ENABLED };
