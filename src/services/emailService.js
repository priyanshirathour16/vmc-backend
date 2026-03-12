/**
 * emailService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Zepto Mail transactional email service.
 *
 * Zepto Mail API docs: https://www.zeptomail.com/api-documentation
 *
 * Required env vars:
 *   ZEPTO_MAIL_API_KEY    → Your Zepto Mail send-mail token (e.g. "Zoho-enczapikey …")
 *   ZEPTO_MAIL_FROM_EMAIL → Verified sender address (e.g. noreply@vmcreviews.com)
 *   ZEPTO_MAIL_FROM_NAME  → Friendly "from" display name (e.g. VMC Reviews)
 *   FRONTEND_URL          → Base URL of frontend (e.g. http://localhost:5173)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios from 'axios';

const ZEPTO_API_URL = 'https://api.zeptomail.in/v1.1/email';

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Low-level Zepto Mail send helper.
 * @param {object} payload  Zepto Mail v1.1 request body
 */
const sendViaZepto = async (payload) => {
  const apiKey = process.env.ZEPTO_MAIL_API_KEY;

  if (!apiKey) {
    throw new Error('ZEPTO_MAIL_API_KEY is not configured');
  }

  try {
    const response = await axios.post(ZEPTO_API_URL, payload, {
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 15000,
    });
    return { success: true, data: response.data };
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data || err.message;
    console.error('[emailService] Zepto Mail error:', {
      status,
      message: detail,
      endpoint: ZEPTO_API_URL,
      hasApiKey: !!apiKey
    });
    throw new Error('Failed to send email. Please try again later.');
  }
};

// ─── password reset email ─────────────────────────────────────────────────────

/**
 * Send a password-reset email containing a one-time link.
 *
 * @param {string} toEmail      Recipient email address
 * @param {string} toName       Recipient display name
 * @param {string} resetToken   JWT reset token (stored in DB)
 */
export const sendPasswordResetEmail = async (toEmail, toName, resetToken) => {
  const fromEmail = process.env.ZEPTO_MAIL_FROM_EMAIL || 'noreply@vmcreviews.com';
  const fromName = process.env.ZEPTO_MAIL_FROM_NAME || 'VMC Reviews';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
  const expiryNote = '1 hour';

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset Your Password – VMC Reviews</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <!-- Card -->
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.07);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#10b981,#0d9488);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                🔐 VMC Reviews
              </p>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">
                Password Reset Request
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:15px;color:#1e293b;font-weight:600;">
                Hi ${toName || 'there'},
              </p>
              <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
                We received a request to reset the password for your VMC Reviews account
                associated with <strong>${toEmail}</strong>.
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.7;">
                Click the button below to create a new password. This link will expire in
                <strong>${expiryNote}</strong>.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="border-radius:10px;background:#10b981;">
                    <a href="${resetLink}"
                      style="display:inline-block;padding:14px 36px;font-size:14px;
                             font-weight:700;color:#ffffff;text-decoration:none;
                             border-radius:10px;letter-spacing:0.2px;">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">
                If the button doesn't work, copy and paste this link in your browser:
              </p>
              <p style="margin:0 0 28px;font-size:12px;word-break:break-all;">
                <a href="${resetLink}" style="color:#10b981;text-decoration:none;">${resetLink}</a>
              </p>

              <!-- Warning box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#fef9f0;border:1px solid #fde68a;border-radius:8px;
                             padding:14px 16px;font-size:12.5px;color:#92400e;line-height:1.6;">
                    <strong>⚠️ Didn't request this?</strong> If you didn't ask to reset your
                    password, you can safely ignore this email. Your password will not change.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;
                       text-align:center;font-size:12px;color:#94a3b8;">
              <p style="margin:0 0 4px;">
                © ${new Date().getFullYear()} VMC Reviews. All rights reserved.
              </p>
              <p style="margin:0;color:#cbd5e1;">
                This is an automated email – please do not reply.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const payload = {
    from: {
      address: fromEmail,
      name: fromName,
    },
    to: [
      {
        email_address: {
          address: toEmail,
          name: toName || toEmail.split('@')[0],
        },
      },
    ],
    subject: 'Reset Your VMC Reviews Password',
    htmlbody: htmlBody,
  };

  return sendViaZepto(payload);
};
