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
