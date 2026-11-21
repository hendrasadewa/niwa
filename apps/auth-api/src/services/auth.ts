import { AuthErrors } from "../errors/auth";
import type { RefreshTokenRepo } from "../repositories/refresh-tokens";
import type { RoleRepo, UserAppRoleAssignment } from "../repositories/roles";
import type { UserRecord, UserRepo } from "../repositories/users";
import type {
  ActiveSessionResponse,
  AuthTokenResponse,
  AuthUserResponse,
} from "../types/auth";
import { signNiwaToken } from "../utils/jwt";
import { hashPassword, verifyPassword } from "../utils/password";
import { generateRawRefreshToken, hashRefreshToken } from "../utils/token";

export type AuthServiceConfig = {
  jwtSecret: string;
  adminEmail?: string;
  accessTokenTtl: number;
  refreshTokenTtl: number;
};

export type AuthServiceDeps = {
  userRepo: UserRepo;
  roleRepo: RoleRepo;
  refreshTokenRepo: RefreshTokenRepo;
  ensureSeeded: () => Promise<void>;
  config: AuthServiceConfig;
};

function toAuthUserResponse(
  record: UserRecord,
  app_roles: AuthUserResponse["app_roles"],
  app_permissions: AuthUserResponse["app_permissions"]
): AuthUserResponse {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    whatsapp_number: record.whatsapp_number,
    is_active: record.is_active,
    app_roles,
    app_permissions,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

export function createAuthService({
  userRepo,
  roleRepo,
  refreshTokenRepo,
  ensureSeeded,
  config,
}: AuthServiceDeps) {
  async function issueRefreshSession(params: {
    userId: string;
    familyId?: string;
    userAgent?: string | null;
  }) {
    const id = crypto.randomUUID();
    const familyId = params.familyId ?? crypto.randomUUID();
    const rawToken = generateRawRefreshToken();
    const tokenHash = await hashRefreshToken(rawToken);
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + config.refreshTokenTtl;

    await refreshTokenRepo.create({
      id,
      user_id: params.userId,
      family_id: familyId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      revoked_at: null,
      replaced_by_id: null,
      user_agent: params.userAgent ? params.userAgent.slice(0, 255) : null,
      created_at: now,
    });

    return { id, familyId, rawToken, expiresAt };
  }

  return {
    async register(input: {
      email: string;
      password: string;
      name: string;
      whatsapp_number?: string;
      app_id?: string;
      role?: string;
      userAgent?: string | null;
    }): Promise<AuthTokenResponse> {
      await ensureSeeded();

      const normalizedEmail = input.email.toLowerCase();
      const normalizedWhatsapp = input.whatsapp_number ?? "";
      const targetAppId = input.app_id || "open-po";

      const existingUser = await userRepo.findByEmail(normalizedEmail);
      if (existingUser) {
        throw AuthErrors.emailAlreadyRegistered();
      }

      const userCount = await userRepo.countAll();
      const isFirstUser = userCount === 0;
      const isConfiguredAdmin =
        Boolean(config.adminEmail) &&
        config.adminEmail?.toLowerCase() === normalizedEmail;

      const userId = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);
      const passwordHash = await hashPassword(input.password);

      const createdUser = await userRepo.create({
        id: userId,
        email: normalizedEmail,
        password_hash: passwordHash,
        name: input.name,
        whatsapp_number: normalizedWhatsapp,
        is_active: true,
        created_at: now,
        updated_at: now,
      });

      const roleAssignments: UserAppRoleAssignment[] = [];

      if (isFirstUser || isConfiguredAdmin) {
        roleAssignments.push(
          { user_id: userId, app_id: "open-po", role_id: "open-po:role-member" },
          { user_id: userId, app_id: "open-po", role_id: "open-po:role-seller" },
          { user_id: userId, app_id: "open-po", role_id: "open-po:role-admin" },
          { user_id: userId, app_id: "pustaka", role_id: "pustaka:role-member" },
          { user_id: userId, app_id: "pustaka", role_id: "pustaka:role-admin" }
        );
      } else {
        const memberRole = await roleRepo.findByAppAndName(
          targetAppId,
          "member"
        );
        if (memberRole) {
          roleAssignments.push({
            user_id: userId,
            app_id: memberRole.app_id,
            role_id: memberRole.id,
          });
        }

        if (input.role === "seller") {
          const sellerRole = await roleRepo.findByAppAndName(
            targetAppId,
            "seller"
          );
          if (sellerRole) {
            roleAssignments.push({
              user_id: userId,
              app_id: sellerRole.app_id,
              role_id: sellerRole.id,
            });
          }
        }
      }

      await roleRepo.assignUserAppRoles(roleAssignments);

      const { app_roles, app_permissions } =
        await roleRepo.getUserAppRolesAndPermissions(userId);

      const userResponse = toAuthUserResponse(
        createdUser,
        app_roles,
        app_permissions
      );
      const token = await signNiwaToken(
        userResponse,
        config.jwtSecret,
        config.accessTokenTtl
      );
      const issuedRefresh = await issueRefreshSession({
        userId,
        userAgent: input.userAgent,
      });

      return {
        user: userResponse,
        token,
        refresh_token: issuedRefresh.rawToken,
        expires_in: config.accessTokenTtl,
      };
    },

    async login(input: {
      email: string;
      password: string;
      userAgent?: string | null;
    }): Promise<AuthTokenResponse> {
      await ensureSeeded();

      const normalizedEmail = input.email.toLowerCase();
      const userRecord = await userRepo.findByEmail(normalizedEmail);

      if (!userRecord || !userRecord.is_active) {
        throw AuthErrors.invalidCredentials();
      }

      const isPasswordValid = await verifyPassword(
        input.password,
        userRecord.password_hash
      );
      if (!isPasswordValid) {
        throw AuthErrors.invalidCredentials();
      }

      const { app_roles, app_permissions } =
        await roleRepo.getUserAppRolesAndPermissions(userRecord.id);

      const userResponse = toAuthUserResponse(
        userRecord,
        app_roles,
        app_permissions
      );
      const token = await signNiwaToken(
        userResponse,
        config.jwtSecret,
        config.accessTokenTtl
      );
      const issuedRefresh = await issueRefreshSession({
        userId: userRecord.id,
        userAgent: input.userAgent,
      });

      return {
        user: userResponse,
        token,
        refresh_token: issuedRefresh.rawToken,
        expires_in: config.accessTokenTtl,
      };
    },

    async refresh(input: {
      refreshToken: string;
      userAgent?: string | null;
    }): Promise<AuthTokenResponse> {
      const tokenHash = await hashRefreshToken(input.refreshToken);
      const existing = await refreshTokenRepo.findByTokenHash(tokenHash);

      if (!existing) {
        throw AuthErrors.refreshTokenInvalid();
      }

      const now = Math.floor(Date.now() / 1000);

      if (existing.revoked_at !== null) {
        await refreshTokenRepo.revokeFamily(existing.family_id, now);
        throw AuthErrors.refreshTokenReused();
      }

      if (existing.expires_at <= now) {
        await refreshTokenRepo.revokeById(existing.id, now);
        throw AuthErrors.refreshTokenExpired();
      }

      const nextId = crypto.randomUUID();
      const nextRawToken = generateRawRefreshToken();
      const nextTokenHash = await hashRefreshToken(nextRawToken);
      const nextExpiresAt = now + config.refreshTokenTtl;
      const effectiveAgent = input.userAgent ?? existing.user_agent;

      await refreshTokenRepo.rotateAtomically(
        existing.id,
        {
          id: nextId,
          user_id: existing.user_id,
          family_id: existing.family_id,
          token_hash: nextTokenHash,
          expires_at: nextExpiresAt,
          revoked_at: null,
          replaced_by_id: null,
          user_agent: effectiveAgent ? effectiveAgent.slice(0, 255) : null,
          created_at: now,
        },
        now
      );

      const userRecord = await userRepo.findById(existing.user_id);
      if (!userRecord || !userRecord.is_active) {
        await refreshTokenRepo.revokeAllForUser(existing.user_id, now);
        throw AuthErrors.userNotFoundOrInactive(
          "User account is inactive or missing"
        );
      }

      const { app_roles, app_permissions } =
        await roleRepo.getUserAppRolesAndPermissions(userRecord.id);

      const userResponse = toAuthUserResponse(
        userRecord,
        app_roles,
        app_permissions
      );
      const token = await signNiwaToken(
        userResponse,
        config.jwtSecret,
        config.accessTokenTtl
      );

      return {
        user: userResponse,
        token,
        refresh_token: nextRawToken,
        expires_in: config.accessTokenTtl,
      };
    },

    async logout(refreshToken?: string): Promise<void> {
      if (!refreshToken) return;
      const tokenHash = await hashRefreshToken(refreshToken);
      const existing = await refreshTokenRepo.findByTokenHash(tokenHash);
      if (!existing) return;

      const now = Math.floor(Date.now() / 1000);
      await refreshTokenRepo.revokeFamily(existing.family_id, now);
    },

    async logoutAll(userId: string): Promise<number> {
      const now = Math.floor(Date.now() / 1000);
      return refreshTokenRepo.revokeAllForUser(userId, now);
    },

    async listSessions(userId: string): Promise<ActiveSessionResponse[]> {
      const now = Math.floor(Date.now() / 1000);
      return refreshTokenRepo.listActiveByUser(userId, now);
    },

    async changePassword(input: {
      currentUser: AuthUserResponse;
      currentPassword: string;
      newPassword: string;
      revokeOtherSessions?: boolean;
      userAgent?: string | null;
    }): Promise<AuthTokenResponse> {
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

      if (input.revokeOtherSessions !== false) {
        await refreshTokenRepo.revokeAllForUser(input.currentUser.id, now);
      }

      const { app_roles, app_permissions } =
        await roleRepo.getUserAppRolesAndPermissions(input.currentUser.id);

      const updatedUser: AuthUserResponse = {
        ...input.currentUser,
        app_roles,
        app_permissions,
        updated_at: now,
      };

      const token = await signNiwaToken(
        updatedUser,
        config.jwtSecret,
        config.accessTokenTtl
      );
      const issuedRefresh = await issueRefreshSession({
        userId: input.currentUser.id,
        userAgent: input.userAgent,
      });

      return {
        user: updatedUser,
        token,
        refresh_token: issuedRefresh.rawToken,
        expires_in: config.accessTokenTtl,
      };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
