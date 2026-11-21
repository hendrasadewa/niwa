import { Hono, type Context } from "hono";
import { csrfGuard } from "../../middlewares/csrf";
import { requireSessionOrJwtMiddleware } from "../../middlewares/session";
import { createIdpSessionRepo } from "../../repositories/idp-sessions";
import { createMailerRepo } from "../../repositories/mailer";
import { createRefreshTokenRepo } from "../../repositories/refresh-tokens";
import { createUserRepo } from "../../repositories/users";
import { createVerificationTokenRepo } from "../../repositories/verification-tokens";
import { createEmailVerificationService } from "../../services/email-verification";
import type { AppEnv } from "../../types/env";
import { buildClearSessionCookie } from "../../utils/cookie";
import { resolveAuthWebUrl } from "../../utils/jwt";
import { validate } from "../../validators";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../../validators/auth";

export function getEmailVerificationService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createEmailVerificationService({
    userRepo: createUserRepo(db),
    verificationTokenRepo: createVerificationTokenRepo(db),
    idpSessionRepo: createIdpSessionRepo(db),
    refreshTokenRepo: createRefreshTokenRepo(db),
    mailer: createMailerRepo({
      resendApiKey: c.env.RESEND_API_KEY,
      emailFrom: c.env.EMAIL_FROM,
    }),
    config: {
      authWebUrl: resolveAuthWebUrl(c.env.AUTH_WEB_URL),
    },
  });
}

export const authEmailRoutes = new Hono<AppEnv>();

// POST /api/v1/auth/email/verify
authEmailRoutes.post(
  "/email/verify",
  validate("json", verifyEmailSchema),
  async (c) => {
    const { token } = c.req.valid("json");
    const result = await getEmailVerificationService(c).verifyEmail(token);
    return c.json({
      message: "Email verified successfully",
      ...result,
    });
  }
);

// POST /api/v1/auth/email/resend
authEmailRoutes.post(
  "/email/resend",
  csrfGuard,
  requireSessionOrJwtMiddleware,
  async (c) => {
    const user = c.get("user")!;
    await getEmailVerificationService(c).sendVerificationEmail({
      userId: user.id,
      enforceCooldown: true,
    });
    return c.json({
      message: "Verification email sent",
    });
  }
);

// POST /api/v1/auth/password/forgot
authEmailRoutes.post(
  "/password/forgot",
  validate("json", forgotPasswordSchema),
  async (c) => {
    const { email } = c.req.valid("json");
    await getEmailVerificationService(c).requestPasswordReset(email);
    return c.json({
      message:
        "If an account exists for that email, a password reset link has been sent.",
    });
  }
);

// POST /api/v1/auth/password/reset
authEmailRoutes.post(
  "/password/reset",
  validate("json", resetPasswordSchema),
  async (c) => {
    const { token, new_password } = c.req.valid("json");
    const result = await getEmailVerificationService(c).resetPassword({
      rawToken: token,
      newPassword: new_password,
    });
    c.header("Set-Cookie", buildClearSessionCookie(c.req.url));
    return c.json({
      message: "Password reset successfully. Please sign in again.",
      ...result,
    });
  }
);
