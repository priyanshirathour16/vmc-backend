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

// ─── review notifications ────────────────────────────────────────────────────

/**
 * Send email notification to business owner when a new review is posted.
 * This function is NON-BLOCKING and catches all errors internally.
 * 
 * @param {Object} review     - Review object { id, title, rating, content, created_at }
 * @param {Object} business   - Business object { id, business_name, email_business }
 * @param {Object} reviewer   - Reviewer object { id, name, email }
 */
export const sendNewReviewNotification = (review, business, reviewer) => {
  // Execute asynchronously without blocking the main flow
  setImmediate(async () => {
    try {
      if (!business.email_business) {
        console.warn(`[emailService] Business ${business.id} has no email. Skipping review notification.`);
        return;
      }

      const fromEmail = process.env.ZEPTO_MAIL_FROM_EMAIL || 'noreply@vmcreviews.com';
      const fromName = process.env.ZEPTO_MAIL_FROM_NAME || 'VMC Reviews';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      
      const reviewLink = `${frontendUrl}/business/reviews?reviewId=${review.id}`;
      const starRating = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
      const reviewDate = new Date(review.created_at).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>New Review Posted – VMC Reviews</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.07);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#f59e0b,#f97316);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                🎉 New Review Posted
              </p>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">
                ${business.business_name} – Pending your approval
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 20px;font-size:15px;color:#1e293b;font-weight:600;">
                Hi ${business.business_name},
              </p>
              
              <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7;">
                A new review has been posted on your business profile and is pending your approval.
              </p>

              <!-- Review Card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
                <tr>
                  <td>
                    <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;font-weight:600;">REVIEWER</p>
                    <p style="margin:0 0 12px;font-size:14px;color:#1e293b;font-weight:600;">
                      ${reviewer.name || 'Anonymous'} ${reviewer.email ? `(${reviewer.email})` : ''}
                    </p>

                    <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;font-weight:600;">RATING</p>
                    <p style="margin:0 0 12px;font-size:16px;">
                      ${starRating} <span style="color:#475569;font-weight:600;">(${review.rating}/5)</span>
                    </p>

                    <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;font-weight:600;">TITLE</p>
                    <p style="margin:0 0 12px;font-size:14px;color:#1e293b;font-weight:600;">
                      ${review.title}
                    </p>

                    <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;font-weight:600;">PREVIEW</p>
                    <p style="margin:0 0 12px;font-size:13px;color:#475569;line-height:1.6;max-height:100px;overflow:hidden;">
                      ${review.content}
                    </p>

                    <p style="margin:0;font-size:12px;color:#94a3b8;">
                      Posted on ${reviewDate}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
                <tr>
                  <td style="border-radius:10px;background:#f59e0b;">
                    <a href="${reviewLink}"
                      style="display:inline-block;padding:14px 36px;font-size:14px;
                             font-weight:700;color:#ffffff;text-decoration:none;
                             border-radius:10px;letter-spacing:0.2px;">
                      Review & Approve/Reject
                    </a>
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
              address: business.email_business,
              name: business.business_name,
            },
          },
        ],
        subject: `New Review: "${review.title}" (${review.rating}⭐) – Pending Approval`,
        htmlbody: htmlBody,
      };

      const result = await sendViaZepto(payload);
      console.log(`✅ [emailService] Review notification sent to ${business.email_business}:`, result.data?.request_id);

    } catch (error) {
      // Log error but never throw - don't break review creation
      console.error(`❌ [emailService] Failed to send review notification:`, error.message);
    }
  });
};

/**
 * Send email notification to reviewer when their review is approved.
 * This function is NON-BLOCKING and catches all errors internally.
 * 
 * @param {Object} review   - Review object { id, title, rating, content }
 * @param {Object} business - Business object { id, business_name }
 * @param {Object} reviewer - Reviewer object { id, name, email }
 */
export const sendReviewApprovedNotification = (review, business, reviewer) => {
  // Execute asynchronously without blocking the main flow
  setImmediate(async () => {
    try {
      if (!reviewer.email) {
        console.warn(`[emailService] Reviewer ${reviewer.id} has no email. Skipping approval notification.`);
        return;
      }

      const fromEmail = process.env.ZEPTO_MAIL_FROM_EMAIL || 'noreply@vmcreviews.com';
      const fromName = process.env.ZEPTO_MAIL_FROM_NAME || 'VMC Reviews';
      
      const starRating = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

      const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Review Published – VMC Reviews</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.07);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#10b981,#0d9488);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                ✅ Review Published
              </p>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">
                Your review has been approved
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:15px;color:#1e293b;font-weight:600;">
                Hi ${reviewer.name || 'Reviewer'},
              </p>
              
              <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7;">
                Great news! Your review for <strong>${business.business_name}</strong> has been approved and is now visible to other customers.
              </p>

              <!-- Review Summary -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f0f9f7;border:1px solid #a7f3d0;border-radius:12px;padding:20px;">
                <tr>
                  <td>
                    <p style="margin:0 0 12px;font-size:14px;color:#1e293b;font-weight:600;">
                      ${review.title}
                    </p>
                    <p style="margin:0 0 12px;font-size:16px;">
                      ${starRating}
                    </p>
                    <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
                      ${review.content}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0;font-size:14px;color:#475569;line-height:1.7;">
                Thank you for sharing your experience! Your feedback helps other customers make informed decisions and helps businesses improve their services.
              </p>
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
              address: reviewer.email,
              name: reviewer.name || 'Reviewer',
            },
          },
        ],
        subject: `Your Review for ${business.business_name} Has Been Published ✅`,
        htmlbody: htmlBody,
      };

      const result = await sendViaZepto(payload);
      console.log(`✅ [emailService] Approval notification sent to ${reviewer.email}:`, result.data?.request_id);

    } catch (error) {
      // Log error but never throw - non-blocking
      console.error(`❌ [emailService] Failed to send approval notification:`, error.message);
    }
  });
};

/**
 * Send email notification to reviewer when their review is rejected.
 * This function is NON-BLOCKING and catches all errors internally.
 * 
 * @param {Object} review           - Review object { id, title, rating, content }
 * @param {Object} business         - Business object { id, business_name }
 * @param {Object} reviewer         - Reviewer object { id, name, email }
 * @param {string} rejectionReason  - Optional reason for rejection
 */
export const sendReviewRejectedNotification = (review, business, reviewer, rejectionReason = null) => {
  // Execute asynchronously without blocking the main flow
  setImmediate(async () => {
    try {
      if (!reviewer.email) {
        console.warn(`[emailService] Reviewer ${reviewer.id} has no email. Skipping rejection notification.`);
        return;
      }

      const fromEmail = process.env.ZEPTO_MAIL_FROM_EMAIL || 'noreply@vmcreviews.com';
      const fromName = process.env.ZEPTO_MAIL_FROM_NAME || 'VMC Reviews';
      
      const starRating = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

      const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Review Status – VMC Reviews</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.07);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#ef4444,#f87171);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                Review Status Update
              </p>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">
                Your review could not be published
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:15px;color:#1e293b;font-weight:600;">
                Hi ${reviewer.name || 'Reviewer'},
              </p>
              
              <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7;">
                Unfortunately, your review for <strong>${business.business_name}</strong> could not be published.
              </p>

              <!-- Review Summary -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;padding:20px;">
                <tr>
                  <td>
                    <p style="margin:0 0 12px;font-size:14px;color:#1e293b;font-weight:600;">
                      ${review.title}
                    </p>
                    <p style="margin:0 0 12px;font-size:16px;">
                      ${starRating}
                    </p>
                    ${rejectionReason ? `
                    <p style="margin:0;font-size:13px;color:#991b1b;font-weight:600;">
                      <strong>Reason:</strong> ${rejectionReason}
                    </p>
                    ` : `
                    <p style="margin:0;font-size:13px;color:#991b1b;font-weight:600;">
                      <strong>Reason:</strong> This review does not meet our community guidelines.
                    </p>
                    `}
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0;font-size:14px;color:#475569;line-height:1.7;">
                Our community guidelines help maintain the quality and authenticity of reviews. If you'd like to learn more about what types of reviews we accept, please review our guidelines.
              </p>

              <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">
                If you have questions, you can contact the business directly at ${business.email_business || 'support@vmcreviews.com'}.
              </p>
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
              address: reviewer.email,
              name: reviewer.name || 'Reviewer',
            },
          },
        ],
        subject: `Review Status: ${business.business_name} – Not Published`,
        htmlbody: htmlBody,
      };

      const result = await sendViaZepto(payload);
      console.log(`✅ [emailService] Rejection notification sent to ${reviewer.email}:`, result.data?.request_id);

    } catch (error) {
      // Log error but never throw - non-blocking
      console.error(`❌ [emailService] Failed to send rejection notification:`, error.message);
    }
  });
};

// ─── welcome email ───────────────────────────────────────────────────────────

/**
 * Send a welcome email to a newly registered consumer.
 * This function is NON-BLOCKING and catches all errors internally.
 * 
 * @param {string} toEmail    Consumer email address
 * @param {string} toName     Consumer display name
 */
export const sendConsumerWelcomeEmail = (toEmail, toName) => {
  // Execute asynchronously without blocking the main flow
  setImmediate(async () => {
    try {
      if (!toEmail) {
        console.warn('[emailService] No email provided for welcome email. Skipping.');
        return;
      }

      const fromEmail = process.env.ZEPTO_MAIL_FROM_EMAIL || 'noreply@vmcreviews.com';
      const fromName = process.env.ZEPTO_MAIL_FROM_NAME || 'VMC Reviews';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to VMC Reviews – Your Voice Matters!</title>
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
            <td style="background:linear-gradient(135deg,#06b6d4,#0891b2);padding:40px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                🎉 Welcome to VMC Reviews!
              </p>
              <p style="margin:12px 0 0;font-size:15px;color:rgba(255,255,255,0.9);">
                Your voice matters. Share your experiences, help others decide.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 20px;font-size:15px;color:#1e293b;font-weight:600;">
                Hi ${toName || 'there'},
              </p>
              
              <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7;">
                Welcome to <strong>VMC Reviews</strong> – the platform where real customers share honest reviews about their favorite (and not-so-favorite) businesses!
              </p>

              <!-- What You Can Do Section -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f0f4f8;border:1px solid #cbd5e1;border-radius:12px;padding:20px;margin:0 0 20px;;">
                <tr>
                  <td>
                    <p style="margin:0 0 16px;font-size:14px;color:#1e293b;font-weight:700;">
                      As a consumer, you can:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;vertical-align:top;">
                          <span style="font-size:16px;margin-right:10px;">📝</span>
                        </td>
                        <td style="padding:8px 0;font-size:13px;color:#475569;line-height:1.6;">
                          <strong>Write Detailed Reviews</strong> – Share your honest experiences and help others decide
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;vertical-align:top;">
                          <span style="font-size:16px;margin-right:10px;">⭐</span>
                        </td>
                        <td style="padding:8px 0;font-size:13px;color:#475569;line-height:1.6;">
                          <strong>Rate Experiences</strong> – Give 1-5 star ratings for quick and easy feedback
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;vertical-align:top;">
                          <span style="font-size:16px;margin-right:10px;">🏆</span>
                        </td>
                        <td style="padding:8px 0;font-size:13px;color:#475569;line-height:1.6;">
                          <strong>Build Your Reputation</strong> – Earn badges and recognition as a trusted reviewer
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;vertical-align:top;">
                          <span style="font-size:16px;margin-right:10px;">🔍</span>
                        </td>
                        <td style="padding:8px 0;font-size:13px;color:#475569;line-height:1.6;">
                          <strong>Discover Businesses</strong> – Browse thousands of verified businesses and read reviews
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Getting Started Section -->
              <p style="margin:20px 0 12px;font-size:14px;color:#1e293b;font-weight:700;">
                Getting Started:
              </p>
              <ol style="margin:0 0 20px;padding-left:20px ;font-size:13px;color:#475569;line-height:1.8;">
                <li>Complete your profile (optional fields help us personalize your experience)</li>
                <li>Browse businesses using our search and filter tools</li>
                <li>Click on any business to see reviews and details</li>
                <li>Click the "Write a Review" button to share your experience</li>
                <li>Your review will be published after business owner approval</li>
              </ol>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:28px auto;width:100%;">
                <tr>
                  <td align="center" style="border-radius:10px;background:linear-gradient(135deg,#06b6d4,#0891b2);">
                    <a href="${frontendUrl}/consumer/home"
                      style="display:inline-block;padding:14px 40px;font-size:14px;
                             font-weight:700;color:#ffffff;text-decoration:none;
                             border-radius:10px;letter-spacing:0.2px;">
                      Start Exploring Businesses
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Community Guidelines -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:16px;margin:20px 0;">
                <tr>
                  <td>
                    <p style="margin:0;font-size:12px;color:#78350f;line-height:1.6;">
                      <strong>💡 Community Guidelines:</strong> Reviews should be honest, respectful, and helpful. 
                      No spam, hate speech, or promotional content. Businesses have the right to approve or reject reviews.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Signature -->
              <p style="margin:24px 0 0;font-size:14px;color:#475569;line-height:1.7;">
                If you have any questions or need help, feel free to reach out to our support team. We're here to help!
              </p>

              <p style="margin:16px 0 0;font-size:14px;color:#475569;">
                Happy reviewing! 🌟
              </p>

              <p style="margin:8px 0 0;font-size:13px;color:#64748b;">
                The VMC Reviews Team
              </p>
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
                You received this email because you created a consumer account on VMC Reviews.
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
        subject: `Welcome to VMC Reviews, ${toName || 'Reviewer'}! 🎉`,
        htmlbody: htmlBody,
      };

      const result = await sendViaZepto(payload);
      console.log(`✅ [emailService] Welcome email sent to ${toEmail}:`, result.data?.request_id);

    } catch (error) {
      // Log error but never throw - non-blocking
      console.error(`❌ [emailService] Failed to send welcome email:`, error.message);
    }
  });
};

/**
 * Send approval email to business owner when their business is approved.
 * This function is NON-BLOCKING and catches all errors internally.
 *
 * @param {string} businessOwnerEmail - Business owner's email
 * @param {string} businessOwnerName  - Business owner's name
 * @param {string} businessName       - Business name
 */
export const sendBusinessApprovedEmail = (businessOwnerEmail, businessOwnerName, businessName) => {
  // Execute asynchronously without blocking the main flow
  setImmediate(async () => {
    try {
      const fromEmail = process.env.ZEPTO_MAIL_FROM_EMAIL || 'noreply@vmcreviews.com';
      const fromName = process.env.ZEPTO_MAIL_FROM_NAME || 'VMC Reviews';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      const dashboardLink = `${frontendUrl}/business/dashboard`;

      const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Business Approved – VMC Reviews</title>
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
            <td style="background:linear-gradient(135deg,#10b981,#0d9488);padding:40px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                ✅ Approved & Verified
              </p>
              <p style="margin:12px 0 0;font-size:15px;color:rgba(255,255,255,0.9);">
                Your business has been verified!
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px;font-size:16px;color:#1e293b;font-weight:600;">
                Hi ${businessOwnerName},
              </p>

              <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.8;">
                Congratulations! 🎉 We're thrilled to inform you that your business <strong>"${businessName}"</strong> has been approved and verified by our team. Your business profile now meets all our quality standards.
              </p>

              <!-- Status Card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f0f9f7;border:2px solid #10b981;border-radius:12px;padding:24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 16px;font-size:14px;color:#1e293b;font-weight:600;">
                      ✅ Business Status
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #a7f3d0;">
                          <span style="font-size:13px;color:#475569;">Verification Status</span>
                          <span style="float:right;font-size:13px;font-weight:600;color:#10b981;">✓ Verified</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="font-size:13px;color:#475569;">Business Name</span>
                          <span style="float:right;font-size:13px;font-weight:600;color:#1e293b;">${businessName}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <p style="margin:28px 0 16px;font-size:14px;color:#1e293b;font-weight:600;">
                📋 What's Next?
              </p>

              <ul style="margin:0 0 24px;padding-left:20px;font-size:13px;color:#475569;line-height:1.8;">
                <li style="margin-bottom:10px;">
                  Your business can now be <strong>published</strong> to the public directory
                </li>
                <li style="margin-bottom:10px;">
                  Customers will be able to see your business and leave reviews
                </li>
                <li style="margin-bottom:10px;">
                  You can manage reviews from your dashboard
                </li>
                <li>
                  Keep your business information up-to-date to maintain your verified status
                </li>
              </ul>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:24px 0;width:100%;">
                <tr>
                  <td align="center">
                    <a href="${dashboardLink}"
                      style="display:inline-block;padding:14px 40px;font-size:14px;
                             font-weight:700;color:#ffffff;text-decoration:none;
                             background:#10b981;border-radius:10px;letter-spacing:0.3px;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Support -->
              <p style="margin:28px 0 16px;font-size:14px;color:#1e293b;font-weight:600;">
                💬 Questions?
              </p>

              <p style="margin:0;font-size:13px;color:#475569;line-height:1.8;">
                If you have any questions about your approval or next steps, please don't hesitate to contact our support team. We're here to help!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} VMC Reviews. All rights reserved.
              </p>
              <p style="margin:0;font-size:11px;color:#cbd5e1;">
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
              address: businessOwnerEmail,
              name: businessOwnerName || 'Business Owner',
            },
          },
        ],
        subject: `✅ Business Approved! "${businessName}" is Now Verified`,
        htmlbody: htmlBody,
      };

      const result = await sendViaZepto(payload);
      console.log(`✅ [emailService] Approval email sent to ${businessOwnerEmail}:`, result.data?.request_id);

    } catch (error) {
      // Log error but never throw - non-blocking
      console.error(`❌ [emailService] Failed to send approval email:`, error.message);
    }
  });
};

/**
 * Send rejection email to business owner when their business is rejected.
 * This function is NON-BLOCKING and catches all errors internally.
 *
 * @param {string} businessOwnerEmail - Business owner's email
 * @param {string} businessOwnerName  - Business owner's name
 * @param {string} businessName       - Business name
 */
export const sendBusinessRejectedEmail = (businessOwnerEmail, businessOwnerName, businessName) => {
  // Execute asynchronously without blocking the main flow
  setImmediate(async () => {
    try {
      const fromEmail = process.env.ZEPTO_MAIL_FROM_EMAIL || 'noreply@vmcreviews.com';
      const fromName = process.env.ZEPTO_MAIL_FROM_NAME || 'VMC Reviews';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      const supportEmail = 'support@vmcreviews.com';
      const dashboardLink = `${frontendUrl}/business/dashboard`;

      const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Business Verification Update – VMC Reviews</title>
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
            <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:40px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                ⚠️ Verification Under Review
              </p>
              <p style="margin:12px 0 0;font-size:15px;color:rgba(255,255,255,0.9);">
                Additional information needed
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px;font-size:16px;color:#1e293b;font-weight:600;">
                Hi ${businessOwnerName},
              </p>

              <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.8;">
                Thank you for submitting your business <strong>"${businessName}"</strong> to VMC Reviews. We've carefully reviewed your application, and unfortunately, it does not currently meet our verification requirements.
              </p>

              <!-- Alert Card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fef3c7;border:2px solid #f97316;border-radius:12px;padding:24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 12px;font-size:14px;color:#92400e;font-weight:600;">
                      ⚠️ Why Was This Rejected?
                    </p>
                    <p style="margin:0;font-size:13px;color:#b45309;line-height:1.8;">
                      Your business information did not meet the required standards for verification. This could include incomplete information, unverified details, or other quality concerns. Our team carefully reviews all submissions to maintain the integrity of our platform.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- What You Can Do -->
              <p style="margin:28px 0 16px;font-size:14px;color:#1e293b;font-weight:600;">
                📝 What You Can Do
              </p>

              <ol style="margin:0 0 24px;padding-left:20px;font-size:13px;color:#475569;line-height:1.8;">
                <li style="margin-bottom:10px;">
                  <strong>Review your business details</strong> - Make sure all information is accurate and complete
                </li>
                <li style="margin-bottom:10px;">
                  <strong>Verify your information</strong> - Ensure business address, phone, and website are correct
                </li>
                <li style="margin-bottom:10px;">
                  <strong>Update your profile</strong> - Add or correct any missing information
                </li>
                <li>
                  <strong>Contact our support team</strong> - We can provide guidance on what needs improvement
                </li>
              </ol>

              <!-- CTA Buttons -->
              <table cellpadding="0" cellspacing="0" style="margin:24px 0;width:100%;">
                <tr>
                  <td align="center" style="padding:0 8px;border-right:1px solid #e2e8f0;">
                    <a href="${dashboardLink}"
                      style="display:inline-block;padding:12px 24px;font-size:13px;
                             font-weight:700;color:#f97316;text-decoration:none;
                             background:#f5f3ff;border:2px solid #f97316;border-radius:8px;">
                      Update Business Info
                    </a>
                  </td>
                  <td align="center" style="padding:0 8px;">
                    <a href="mailto:${supportEmail}"
                      style="display:inline-block;padding:12px 24px;font-size:13px;
                             font-weight:700;color:#ffffff;text-decoration:none;
                             background:#f97316;border-radius:8px;">
                      Contact Support
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Support Info -->
              <p style="margin:28px 0 16px;font-size:14px;color:#1e293b;font-weight:600;">
                💬 Need Help?
              </p>

              <p style="margin:0;font-size:13px;color:#475569;line-height:1.8;">
                Our support team is ready to assist you. Reach out to us at <strong>${supportEmail}</strong> if you have any questions about the verification process or need guidance on what to improve.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} VMC Reviews. All rights reserved.
              </p>
              <p style="margin:0;font-size:11px;color:#cbd5e1;">
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
              address: businessOwnerEmail,
              name: businessOwnerName || 'Business Owner',
            },
          },
        ],
        subject: `⚠️ Business Verification Status Update – "${businessName}"`,
        htmlbody: htmlBody,
      };

      const result = await sendViaZepto(payload);
      console.log(`✅ [emailService] Rejection email sent to ${businessOwnerEmail}:`, result.data?.request_id);

    } catch (error) {
      // Log error but never throw - non-blocking
      console.error(`❌ [emailService] Failed to send rejection email:`, error.message);
    }
  });
};
