import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { AuthErrors } from "../errors/auth";
import type { RoleRepo } from "../repositories/roles";
import type { UserRepo } from "../repositories/users";
import type {
  WebAuthnCredentialRecord,
  WebAuthnRepo,
} from "../repositories/webauthn";
import type { AuthUserResponse } from "../types/auth";
import { parseJsonStringArray } from "../utils/origin";
import {
  WEBAUTHN_CHALLENGE_TTL_SECONDS,
  base64UrlToUint8Array,
  uint8ArrayToBase64Url,
  type ResolvedWebAuthnConfig,
} from "../utils/webauthn";

export type PasskeyResponse = {
  id: string;
  name: string;
  device_type: string;
  backed_up: boolean;
  transports: string[];
  created_at: number;
  last_used_at: number | null;
};

export type PasskeyServiceDeps = {
  userRepo: UserRepo;
  roleRepo: RoleRepo;
  webauthnRepo: WebAuthnRepo;
  config: ResolvedWebAuthnConfig;
};

function toPasskeyResponse(record: WebAuthnCredentialRecord): PasskeyResponse {
  return {
    id: record.id,
    name: record.name,
    device_type: record.device_type,
    backed_up: record.backed_up,
    transports: parseJsonStringArray(record.transports),
    created_at: record.created_at,
    last_used_at: record.last_used_at ?? null,
  };
}

export function createPasskeyService({
  userRepo,
  roleRepo,
  webauthnRepo,
  config,
}: PasskeyServiceDeps) {
  return {
    async listPasskeys(userId: string): Promise<PasskeyResponse[]> {
      const rows = await webauthnRepo.listCredentialsByUser(userId);
      return rows.map(toPasskeyResponse);
    },

    async startRegistration(user: AuthUserResponse) {
      const existing = await webauthnRepo.listCredentialsByUser(user.id);

      const options = await generateRegistrationOptions({
        rpName: config.rpName,
        rpID: config.rpID,
        userID: new TextEncoder().encode(user.id),
        userName: user.email,
        userDisplayName: user.name,
        attestationType: "none",
        excludeCredentials: existing.map((cred) => ({
          id: cred.id,
          transports: parseJsonStringArray(
            cred.transports
          ) as AuthenticatorTransportFuture[],
        })),
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
      });

      const now = Math.floor(Date.now() / 1000);
      const challengeId = crypto.randomUUID();
      await webauthnRepo.createChallenge({
        id: challengeId,
        user_id: user.id,
        challenge: options.challenge,
        purpose: "register",
        expires_at: now + WEBAUTHN_CHALLENGE_TTL_SECONDS,
        consumed_at: null,
        created_at: now,
      });

      return { challenge_id: challengeId, options };
    },

    async verifyRegistration(input: {
      user: AuthUserResponse;
      challengeId: string;
      name?: string;
      response: Record<string, unknown>;
    }): Promise<{ passkey: PasskeyResponse }> {
      const challengeRow = await webauthnRepo.findChallengeById(
        input.challengeId
      );
      const now = Math.floor(Date.now() / 1000);

      if (
        !challengeRow ||
        challengeRow.purpose !== "register" ||
        challengeRow.user_id !== input.user.id ||
        challengeRow.consumed_at !== null ||
        challengeRow.expires_at <= now
      ) {
        throw AuthErrors.passkeyChallengeInvalid();
      }

      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response: input.response as unknown as RegistrationResponseJSON,
          expectedChallenge: challengeRow.challenge,
          expectedOrigin: config.expectedOrigin,
          expectedRPID: config.rpID,
          requireUserVerification: false,
        });
      } catch {
        throw AuthErrors.passkeyVerificationFailed(
          "Could not verify passkey registration"
        );
      }

      if (!verification.verified || !verification.registrationInfo) {
        throw AuthErrors.passkeyVerificationFailed(
          "Passkey registration was not verified"
        );
      }

      const { credential, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;

      const duplicate = await webauthnRepo.findCredentialById(credential.id);
      if (duplicate) {
        throw AuthErrors.passkeyAlreadyRegistered();
      }

      await webauthnRepo.markChallengeConsumed(challengeRow.id, now);

      const label =
        input.name?.trim() ||
        (credentialDeviceType === "multiDevice"
          ? "Synced Passkey"
          : "Security Key");

      const created = await webauthnRepo.createCredential({
        id: credential.id,
        user_id: input.user.id,
        public_key: uint8ArrayToBase64Url(credential.publicKey),
        counter: credential.counter,
        transports: JSON.stringify(credential.transports ?? []),
        device_type: credentialDeviceType,
        backed_up: credentialBackedUp,
        name: label,
        created_at: now,
        last_used_at: null,
      });

      return { passkey: toPasskeyResponse(created) };
    },

    async renamePasskey(input: {
      userId: string;
      passkeyId: string;
      name: string;
    }): Promise<{ passkey: PasskeyResponse }> {
      const updated = await webauthnRepo.renameCredentialForUser(
        input.passkeyId,
        input.userId,
        input.name
      );
      if (!updated) {
        throw AuthErrors.passkeyNotFound();
      }
      const row = await webauthnRepo.findCredentialByIdAndUser(
        input.passkeyId,
        input.userId
      );
      if (!row) {
        throw AuthErrors.passkeyNotFound();
      }
      return { passkey: toPasskeyResponse(row) };
    },

    async deletePasskey(input: {
      userId: string;
      passkeyId: string;
    }): Promise<void> {
      const deleted = await webauthnRepo.deleteCredentialForUser(
        input.passkeyId,
        input.userId
      );
      if (!deleted) {
        throw AuthErrors.passkeyNotFound();
      }
    },

    async startLogin(email?: string) {
      let allowCredentials:
        | Array<{ id: string; transports?: AuthenticatorTransportFuture[] }>
        | undefined;
      let matchedUserId: string | null = null;

      if (email) {
        const user = await userRepo.findByEmail(email.toLowerCase());
        if (user && user.is_active) {
          matchedUserId = user.id;
          const creds = await webauthnRepo.listCredentialsByUser(user.id);
          if (creds.length > 0) {
            allowCredentials = creds.map((cred) => ({
              id: cred.id,
              transports: parseJsonStringArray(
                cred.transports
              ) as AuthenticatorTransportFuture[],
            }));
          }
        }
      }

      const options = await generateAuthenticationOptions({
        rpID: config.rpID,
        userVerification: "preferred",
        ...(allowCredentials ? { allowCredentials } : {}),
      });

      const now = Math.floor(Date.now() / 1000);
      const challengeId = crypto.randomUUID();
      await webauthnRepo.createChallenge({
        id: challengeId,
        user_id: matchedUserId,
        challenge: options.challenge,
        purpose: "authenticate",
        expires_at: now + WEBAUTHN_CHALLENGE_TTL_SECONDS,
        consumed_at: null,
        created_at: now,
      });

      return { challenge_id: challengeId, options };
    },

    async verifyLogin(input: {
      challengeId: string;
      response: Record<string, unknown>;
    }): Promise<{ user: AuthUserResponse }> {
      const challengeRow = await webauthnRepo.findChallengeById(
        input.challengeId
      );
      const now = Math.floor(Date.now() / 1000);

      if (
        !challengeRow ||
        challengeRow.purpose !== "authenticate" ||
        challengeRow.consumed_at !== null ||
        challengeRow.expires_at <= now
      ) {
        throw AuthErrors.passkeyChallengeInvalid();
      }

      const authResponse =
        input.response as unknown as AuthenticationResponseJSON;
      if (!authResponse || typeof authResponse.id !== "string") {
        throw AuthErrors.passkeyVerificationFailed();
      }

      const credentialRecord = await webauthnRepo.findCredentialById(
        authResponse.id
      );
      if (!credentialRecord) {
        throw AuthErrors.passkeyVerificationFailed(
          "No account found for this passkey"
        );
      }

      const userRecord = await userRepo.findById(credentialRecord.user_id);
      if (!userRecord || !userRecord.is_active) {
        throw AuthErrors.userNotFoundOrInactive();
      }

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: authResponse,
          expectedChallenge: challengeRow.challenge,
          expectedOrigin: config.expectedOrigin,
          expectedRPID: config.rpID,
          requireUserVerification: false,
          credential: {
            id: credentialRecord.id,
            publicKey: base64UrlToUint8Array(credentialRecord.public_key),
            counter: credentialRecord.counter,
            transports: parseJsonStringArray(
              credentialRecord.transports
            ) as AuthenticatorTransportFuture[],
          },
        });
      } catch {
        throw AuthErrors.passkeyVerificationFailed();
      }

      if (!verification.verified) {
        throw AuthErrors.passkeyVerificationFailed();
      }

      await Promise.all([
        webauthnRepo.markChallengeConsumed(challengeRow.id, now),
        webauthnRepo.updateCounterAndLastUsed(credentialRecord.id, {
          counter: verification.authenticationInfo.newCounter,
          last_used_at: now,
        }),
      ]);

      const { app_roles, app_permissions } =
        await roleRepo.getUserAppRolesAndPermissions(userRecord.id);

      const user: AuthUserResponse = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        whatsapp_number: userRecord.whatsapp_number,
        is_active: userRecord.is_active,
        email_verified_at: userRecord.email_verified_at ?? null,
        app_roles,
        app_permissions,
        created_at: userRecord.created_at,
        updated_at: userRecord.updated_at,
      };

      return { user };
    },
  };
}

export type PasskeyService = ReturnType<typeof createPasskeyService>;
