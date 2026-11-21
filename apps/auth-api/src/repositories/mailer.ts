import { AuthErrors } from "../errors/auth";
import { maskEmail } from "../utils/pii";

export const DEFAULT_EMAIL_FROM = "Niwa <no-reply@hendrasadewa.com>";
const RESEND_API_URL = "https://api.resend.com/emails";

export type MailerConfig = {
  resendApiKey?: string;
  emailFrom?: string;
};

type SendEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailShell(input: {
  heading: string;
  greeting: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  footnote: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#0a0a0a;color:#e5e5e5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#171717;border:1px solid #262626;border-radius:12px;padding:32px;">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#34d399;font-weight:600;">Niwa Account</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#fafafa;">${escapeHtml(input.heading)}</h1>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#d4d4d4;">${escapeHtml(input.greeting)}</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#d4d4d4;">${escapeHtml(input.body)}</p>
                <p style="margin:0 0 24px;">
                  <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background-color:#10b981;color:#052e16;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;">
                    ${escapeHtml(input.ctaLabel)}
                  </a>
                </p>
                <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#a3a3a3;">Or copy and paste this link into your browser:</p>
                <p style="margin:0 0 20px;font-size:12px;line-height:1.5;word-break:break-all;color:#34d399;">${escapeHtml(input.ctaUrl)}</p>
                <hr style="border:none;border-top:1px solid #262626;margin:20px 0;" />
                <p style="margin:0;font-size:12px;line-height:1.5;color:#737373;">${escapeHtml(input.footnote)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function createMailerRepo(config: MailerConfig) {
  const from = config.emailFrom?.trim() || DEFAULT_EMAIL_FROM;

  async function send(payload: SendEmailPayload): Promise<void> {
    if (!config.resendApiKey) {
      console.info("[niwa-mailer:dev]", {
        from,
        to: maskEmail(payload.to),
        subject: payload.subject,
        text: payload.text,
      });
      return;
    }

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error("[niwa-mailer:resend-error]", response.status, errorBody);
      throw AuthErrors.emailDeliveryFailed();
    }
  }

  return {
    async sendVerificationEmail(input: {
      to: string;
      name: string;
      verifyUrl: string;
    }): Promise<void> {
      const subject = "Verify your Niwa email address";
      const text = [
        `Hi ${input.name},`,
        "",
        "Please verify your email address for your Niwa account by opening the link below (valid for 24 hours):",
        input.verifyUrl,
        "",
        "If you did not create a Niwa account, you can safely ignore this email.",
      ].join("\n");

      const html = buildEmailShell({
        heading: "Verify your email address",
        greeting: `Hi ${input.name},`,
        body: "Confirm your email address to secure your Niwa account and enable account recovery. This verification link expires in 24 hours.",
        ctaLabel: "Verify Email Address",
        ctaUrl: input.verifyUrl,
        footnote:
          "If you did not create a Niwa account, you can safely ignore this message.",
      });

      await send({ to: input.to, subject, html, text });
    },

    async sendPasswordResetEmail(input: {
      to: string;
      name: string;
      resetUrl: string;
    }): Promise<void> {
      const subject = "Reset your Niwa password";
      const text = [
        `Hi ${input.name},`,
        "",
        "We received a request to reset the password for your Niwa account. Open the link below within 30 minutes to choose a new password:",
        input.resetUrl,
        "",
        "If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.",
      ].join("\n");

      const html = buildEmailShell({
        heading: "Reset your password",
        greeting: `Hi ${input.name},`,
        body: "We received a request to reset your Niwa account password. This link expires in 30 minutes and will sign you out of all active sessions once completed.",
        ctaLabel: "Reset Password",
        ctaUrl: input.resetUrl,
        footnote:
          "If you did not request a password reset, you can safely ignore this email.",
      });

      await send({ to: input.to, subject, html, text });
    },
  };
}

export type MailerRepo = ReturnType<typeof createMailerRepo>;
