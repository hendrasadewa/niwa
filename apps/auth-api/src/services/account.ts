import { AuthErrors } from "../errors/auth";
import { SsoErrors } from "../errors/sso";
import type { ConsentRepo } from "../repositories/consents";
import type { IdpSessionRepo } from "../repositories/idp-sessions";
import type { RefreshTokenRepo } from "../repositories/refresh-tokens";
import type { RoleRepo } from "../repositories/roles";
import type { UserRepo } from "../repositories/users";
import type { AuthUserResponse } from "../types/auth";
import type {
  AccountSessionResponse,
  ConnectedAppResponse,
} from "../types/sso";
import { parseJsonStringArray } from "../utils/origin";
import { hashPassword, verifyPassword } from "../utils/password";

export type AccountServiceDeps = {
  userRepo: UserRepo;
  roleRepo: RoleRepo;
  idpSessionRepo: IdpSessionRepo;
  consentRepo: ConsentRepo;
  refreshTokenRepo: RefreshTokenRepo;
};

export function createAccountService({
  userRepo,
  roleRepo,
  idpSessionRepo,
  consentRepo,
  refreshTokenRepo,
}: AccountServiceDeps) {
  return {
    async updateProfile(input: {
      currentUser: AuthUserResponse;
      name?: string;
      whatsapp_number?: string;
    }): Promise<{ user: AuthUserResponse }> {
      const now = Math.floor(Date.now() / 1000);
      const nextName = input.name ?? input.currentUser.name;
      const nextWhatsapp =
        input.whatsapp_number ?? input.currentUser.whatsapp_number;

      await userRepo.updateProfile(input.currentUser.id, {
        name: nextName,
        whatsapp_number: nextWhatsapp,
        updated_at: now,
      });

      const { app_roles, app_permissions } =
        await roleRepo.getUserAppRolesAndPermissions(input.currentUser.id);

      return {
        user: {
          ...input.currentUser,
          name: nextName,
          whatsapp_number: nextWhatsapp,
          app_roles,
          app_permissions,
          updated_at: now,
        },
      };
    },

    async changePassword(input: {
      currentUser: AuthUserResponse;
      currentPassword: string;
      newPassword: string;
      currentSessionId?: string;
      revokeOtherSessions?: boolean;
    }): Promise<{ revoked_sessions: number }> {
      const userRecord = await userRepo.findById(input.currentUser.id);
      if (!userRecord || !userRecord.is_active) {
        throw AuthErrors.userNotFoundOrInactive();
      }

      const isCurrentValid = await verifyPassword(
        input.currentPassword,
        userRecord.password_hash
      );
      if (!isCurrentValid) {
        throw AuthErrors.invalidCurrentPassword();
      }

      const now = Math.floor(Date.now() / 1000);
      const newHash = await hashPassword(input.newPassword);

      await userRepo.updatePassword(input.currentUser.id, {
        password_hash: newHash,
        updated_at: now,
      });

      let revokedSessions = 0;
      if (input.revokeOtherSessions !== false) {
        revokedSessions = input.currentSessionId
          ? await idpSessionRepo.revokeAllExcept(
              input.currentUser.id,
              input.currentSessionId,
              now
            )
          : await idpSessionRepo.revokeAllForUser(input.currentUser.id, now);
        await refreshTokenRepo.revokeAllForUser(input.currentUser.id, now);
      }

      return { revoked_sessions: revokedSessions };
    },

    async listSessions(
      userId: string,
      currentSessionId?: string
    ): Promise<AccountSessionResponse[]> {
      const now = Math.floor(Date.now() / 1000);
      const rows = await idpSessionRepo.listActiveByUser(userId, now);
      return rows.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        amr: parseJsonStringArray(row.amr),
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        last_seen_at: row.last_seen_at,
        expires_at: row.expires_at,
        created_at: row.created_at,
        is_current: Boolean(currentSessionId && row.id === currentSessionId),
      }));
    },

    async revokeSession(userId: string, sessionId: string): Promise<void> {
      const now = Math.floor(Date.now() / 1000);
      const revoked = await idpSessionRepo.revokeForUserById(
        userId,
        sessionId,
        now
      );
      if (!revoked) {
        throw SsoErrors.sessionNotFound();
      }
    },

    async revokeAllSessions(userId: string): Promise<number> {
      const now = Math.floor(Date.now() / 1000);
      const [idpCount] = await Promise.all([
        idpSessionRepo.revokeAllForUser(userId, now),
        refreshTokenRepo.revokeAllForUser(userId, now),
      ]);
      return idpCount;
    },

    async listConnectedApps(userId: string): Promise<ConnectedAppResponse[]> {
      const [consents, { app_roles }] = await Promise.all([
        consentRepo.listActiveByUser(userId),
        roleRepo.getUserAppRolesAndPermissions(userId),
      ]);

      return consents.map((c) => ({
        app_id: c.app_id,
        name: c.name,
        description: c.description,
        icon_url: c.icon_url,
        granted_scopes: parseJsonStringArray(c.granted_scopes),
        roles: app_roles[c.app_id] ?? [],
        consented_at: c.consented_at,
      }));
    },

    async revokeAppConsent(userId: string, appId: string): Promise<void> {
      const now = Math.floor(Date.now() / 1000);
      const revoked = await consentRepo.revoke(userId, appId, now);
      if (!revoked) {
        throw SsoErrors.consentNotFound(appId);
      }
    },
  };
}

export type AccountService = ReturnType<typeof createAccountService>;
