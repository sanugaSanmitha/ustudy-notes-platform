
import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

export async function sendVerificationEmail(
  email: string,
  token: string
) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  const resend = getResendClient();

  if (!resend) {
    return { success: false, error: 'Missing RESEND_API_KEY' };
  }

  try {
    await resend.emails.send({
      from: 'noreply@hkust-notes.com',
      to: email,
      subject: 'Verify Your HKUST Notes Account',
      html: `
        <h2>Welcome to HKUST Notes!</h2>
        <p>Click the link below to verify your email address:</p>
        <a href="${verificationUrl}" style="
          background-color: #2563EB;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 8px;
          display: inline-block;
        ">
          Verify Email
        </a>
        <p>Or paste this link in your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link expires in 24 hours.</p>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
) {
  const resend = getResendClient();

  if (!resend) {
    return { success: false, error: 'Missing RESEND_API_KEY' };
  }

  try {
    await resend.emails.send({
      from: 'noreply@hkust-notes.com',
      to: email,
      subject: 'Reset Your HKUST Notes Password',
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="
          background-color: #2563EB;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 8px;
          display: inline-block;
        ">
          Reset Password
        </a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, ignore this email.</p>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}
