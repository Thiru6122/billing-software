const { Resend } = require('resend');
const nodemailer = require('nodemailer');

async function sendViaResend({ to, subject, html }) {
  const apiKey = process.env.RESEND_API;
  if (!apiKey) return null;

  const from =
    process.env.LICENSE_EMAIL_FROM ||
    process.env.idurar_app_email ||
    'Saltum <onboarding@resend.dev>';
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({ from, to, subject, html });

  if (error) {
    const err = new Error(error.message || 'Failed to send email via Resend.');
    err.code = 'EMAIL_SEND_FAILED';
    throw err;
  }

  return data;
}

async function sendViaSmtp({ to, subject, html }) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || user,
    to,
    subject,
    html,
  });

  return { provider: 'smtp' };
}

async function sendEmail({ to, subject, html }) {
  try {
    const resendResult = await sendViaResend({ to, subject, html });
    if (resendResult) return resendResult;
  } catch (error) {
    if (!process.env.SMTP_HOST) throw error;
  }

  const smtpResult = await sendViaSmtp({ to, subject, html });
  if (smtpResult) return smtpResult;

  const err = new Error(
    'Email is not configured. Set RESEND_API or SMTP_HOST/SMTP_USER/SMTP_PASS in backend/.env.'
  );
  err.code = 'EMAIL_NOT_CONFIGURED';
  throw err;
}

module.exports = { sendEmail };
