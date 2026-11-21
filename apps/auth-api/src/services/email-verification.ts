import { AuthErrors } from "../errors/auth";
import type { IdpSessionRepo } from "../repositories/idp-sessions";
import type { MailerRepo } from "../repositories/mailer";
import type { RefreshTokenRepo } from "../repositories/refresh-tokens";
import type { UserRepo } from "../repositories/users";
import type { VerificationTokenRepo } from "../repositories/verification-tokens";
import { hashPassword } from "../utils/password";
import {
  EMAIL_VERIFY_TOKEN_TTL_SECONDS,
  PASSWORD_RESET_TOKEN_TTL_SECONDS,
  VERIFICATION_RESEND_COOLDOWN_SECONDS,
  generateRawVerificationToken,
  hashToken,
} from "../utils/token";

export type EmailVerificationServiceDeps = {
  userRepo: UserRepo;
  verificationTokenRepo: VerificationTokenRepo;
  idpSessionRepo: IdpSessionRepo;
  refreshTokenRepo: RefreshTokenRepo;
  mailer: MailerRepo;
  config: {
    authWebUrl: string;
  };
};

export function createEmailVerificationService({
  userRepo,
  verificationTokenRepo,
  idpSessionRepo,
  refreshTokenRepo,
  mailer,
  config,
}: EmailVerificationServiceDeps) {
  const baseUrl = config.authWebUrl.replace(/\/+$/, "");

  return {
    async sendVerificationEmail(input: {
      userId: string;
      enforceCooldown?: boolean;
    }): Promise<void> {
      const user = await userRepo.findById(input.userId);
      if (!user || !user.is_active) {
        throw AuthErrors.userNotFoundOrInactive();
      }
      if (user.email_verified_at !== null) {
        throw AuthErrors.emailAlreadyVerified();
      }

      const now = Math.floor(Date.now() / 1000);
      if (input.enforceCooldown) {
        const latest =
          await verificationTokenRepo.findLatestByUserAndPurpose(
            user.id,
            "email_verify"
          );
        if (latest) {
          const elapsed = now - latest.created_at;
          if (elapsed < VERIFICATION_RESEND_COOLDOWN_SECONDS) {
            throw AuthErrors.verificationResendRateLimited(
              VERIFICATION_RESEND_COOLDOWN_SECONDS - elapsed
            );
          }
        }
      }

      await verificationTokenRepo.invalidateActiveForUserAndPurpose(
        user.id,
        "email_verify",
        now
      );

      const rawToken = generateRawVerificationToken("email_verify");
      const tokenHash = await hashToken(rawToken);

      await verificationTokenRepo.create({
        id: crypto.randomUUID(),
        user_id: user.id,
        purpose: "email_verify",
        token_hash: tokenHash,
        expires_at: now + EMAIL_VERIFY_TOKEN_TTL_SECONDS,
        consumed_at: null,
        created_at: now,
      });

      const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;
      await mailer.sendVerificationEmail({
        to: user.email,
        name: user.name,
        verifyUrl,
      });
    },

    async verifyEmail(rawToken: string): Promise<{ email_verified_at: number }> {
      const tokenHash = await hashToken(rawToken);
      const record = await verificationTokenRepo.findByTokenHash(tokenHash);
      const now = Math.floor(Date.now() / 1000);

      if (
        !record ||
        record.purpose !== "email_verify" ||
        record.consumed_at !== null ||
        record.expires_at <= now
      ) {
        throw AuthErrors.invalidOrExpiredVerificationToken(
          "Email verification link is invalid or has expired"
        );
      }

      const user = await userRepo.findById(record.user_id);
      if (!user || !user.is_active) {
        throw AuthErrors.userNotFoundOrInactive();
      }

      await verificationTokenRepo.markConsumed(record.id, now);
      const verifiedAt = user.email_verified_at ?? now;
      if (user.email_verified_at === null) {
        await userRepo.markEmailVerified(user.id, {
          email_verified_at: verifiedAt,
          updated_at: now,
        });
      }

      return { email_verified_at: verifiedAt };
    },

    async requestPasswordReset(email: string): Promise<void> {
      const normalizedEmail = email.toLowerCase();
      const user = await userRepo.findByEmail(normalizedEmail);
      // Always succeed silently if user does not exist or is inactive (anti-enumeration)
      if (!user || !user.is_active) {
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const latest = await verificationTokenRepo.findLatestByUserAndPurpose(
        user.id,
        "password_reset"
      );
      if (latest && now - latest.created_at < VERIFICATION_RESEND_COOLDOWN_SECONDS) {
        // Silently absorb rapid duplicate requests without leaking account existence
        return;
      }

      await verificationTokenRepo.invalidateActiveForUserAndPurpose(
        user.id,
        "password_reset",
        now
      );

      const rawToken = generateRawVerificationToken("password_reset");
      const tokenHash = await hashToken(rawToken);

      await verificationTokenRepo.create({
        id: crypto.randomUUID(),
        user_id: user.id,
        purpose: "password_reset",
        token_hash: tokenHash,
        expires_at: now + PASSWORD_RESET_TOKEN_TTL_SECONDS,
        consumed_at: null,
        created_at: now,
      });

      const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
      await mailer.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });
    },

    async resetPassword(input: {
      rawToken: string;
      newPassword: string;
    }): Promise<{ revoked_sessions: number }> {
      const tokenHash = await hashToken(input.rawToken);
      const record = await verificationTokenRepo.findByTokenHash(tokenHash);
      const now = Math.floor(Date.now() / 1000);

      if (
        !record ||
        record.purpose !== "password_reset" ||
        record.consumed_at !== null ||
        record.expires_at <= now
      ) {
        throw AuthErrors.invalidOrExpiredVerificationToken(
          "Password reset link is invalid or has expired"
        );
      }

      const user = await userRepo.findById(record.user_id);
      if (!user || !user.is_active) {
        throw AuthErrors.userNotFoundOrInactive();
      }

      const newHash = await hashPassword(input.newPassword);
      await userRepo.updatePassword(user.id, {
        password_hash: newHash,
        updated_at: now,
      });
      await verificationTokenRepo.markConsumed(record.id, now);

      const [revokedSessions] = await Promise.all([
        idpSessionRepo.revokeAllForUser(user.id, now),
        refreshTokenRepo.revokeAllForUser(user.id, now),
      ]);

      return { revoked_sessions: revokedSessions };
    },
  };
}

export type EmailVerificationService = ReturnType<
  typeof createEmailVerificationService
>;
