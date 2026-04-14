import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'VeriCred'
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'noreply@vericred.app'

/**
 * Sends a one-time password (OTP) email to the user for authentication.
 *
 * @param to - Recipient email address
 * @param otp - Plaintext 6-digit OTP code
 */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: `Your ${APP_NAME} login code: ${otp}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1d4ed8; margin-bottom: 8px;">${APP_NAME}</h2>
        <p style="color: #374151; margin-bottom: 24px;">Use the code below to sign in to your account. It expires in <strong>10 minutes</strong>.</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #1d4ed8;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Failed to send OTP email: ${error.message}`)
  }
}

/**
 * Sends a credential invitation email with a claim link.
 *
 * @param to - Recipient email address
 * @param credentialName - Name of the credential being issued
 * @param issuerName - Display name of the issuing organisation
 * @param claimUrl - Full claim URL (e.g. https://app.vericred.dev/claim/{badgeId})
 */
export async function sendInvitationEmail(
  to: string,
  credentialName: string,
  issuerName: string,
  claimUrl: string,
): Promise<void> {
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: `You've earned a credential: ${credentialName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1d4ed8; margin-bottom: 8px;">${APP_NAME}</h2>
        <p style="color: #374151;">Congratulations! <strong>${issuerName}</strong> has issued you a credential.</p>
        <h3 style="color: #111827; margin: 16px 0 8px;">${credentialName}</h3>
        <p style="color: #374151; margin-bottom: 24px;">Click the button below to claim your credential and add it to your wallet.</p>
        <a href="${claimUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-bottom: 24px;">
          Claim Your Credential
        </a>
        <p style="color: #6b7280; font-size: 13px;">Or copy this link:<br/><a href="${claimUrl}" style="color: #2563eb;">${claimUrl}</a></p>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Failed to send invitation email: ${error.message}`)
  }
}
