import { SsoErrors } from "../errors/sso";
import type { AppRepo } from "../repositories/apps";
import type { ConsentRepo } from "../repositories/consents";
import type { IdpSessionRepo } from "../repositories/idp-sessions";
import type { RoleRepo } from "../repositories/roles";
import type { AuthUserResponse } from "../types/auth";
import type {
  IdpSessionInfo,
  SsoConsentResponse,
  SsoTokenResponse,
} from "../types/sso";
import { signNiwaToken, type JwtSigningConfig } from "../utils/jwt";
import { isValidRedirectUri, parseJsonStringArray } from "../utils/origin";
import { generateRawSessionToken, hashToken } from "../utils/token";

export type SsoServiceConfig = {
  jwtSigning: JwtSigningConfig;
  accessTokenTtl: number;
  idpSessionTtl: number;
  authWebUrl: string;
};

export type SsoServiceDeps = {
  appRepo: AppRepo;
  roleRepo: RoleRepo;
  idpSessionRepo: IdpSessionRepo;
  consentRepo: ConsentRepo;
  ensureSeeded: () => Promise<void>;
  config: SsoServiceConfig;
};

const DEFAULT_GRANTED_SCOPES = ["profile", "email", "roles"];

export function createSsoService({
  appRepo,
  roleRepo,
  idpSessionRepo,
  consentRepo,
  ensureSeeded,
  config,
}: SsoServiceDeps) {
  return {
    async issueSessionForUser(input: {
      userId: string;
      amr?: string[];
      ipAddress?: string | null;
      userAgent?: string | null;
    }): Promise<{
      session: IdpSessionInfo;
      rawToken: string;
      maxAge: number;
    }> {
      const id = crypto.randomUUID();
      const rawToken = generateRawSessionToken();
      const sessionHash = await hashToken(rawToken);
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + config.idpSessionTtl;
      const amr = input.amr && input.amr.length > 0 ? input.amr : ["pwd"];

      await idpSessionRepo.create({
        id,
        user_id: input.userId,
        session_hash: sessionHash,
        amr: JSON.stringify(amr),
        ip_address: input.ipAddress ? input.ipAddress.slice(0, 64) : null,
        user_agent: input.userAgent ? input.userAgent.slice(0, 255) : null,
        last_seen_at: now,
        expires_at: expiresAt,
        revoked_at: null,
        created_at: now,
      });

      return {
        session: {
          id,
          user_id: input.userId,
          amr,
          ip_address: input.ipAddress ? input.ipAddress.slice(0, 64) : null,
          user_agent: input.userAgent ? input.userAgent.slice(0, 255) : null,
          last_seen_at: now,
          expires_at: expiresAt,
          created_at: now,
        },
        rawToken,
        maxAge: config.idpSessionTtl,
      };
    },

    async exchangeToken(input: {
      session?: IdpSessionInfo;
      user?: AuthUserResponse;
      appId: string;
      redirectUri?: string;
    }): Promise<SsoTokenResponse> {
      await ensureSeeded();

      const app = await appRepo.findById(input.appId);
      if (!app) {
        throw SsoErrors.appNotFound(input.appId);
      }

      if (input.redirectUri) {
        const allowedUris = parseJsonStringArray(app.allowed_redirect_uris);
        if (!isValidRedirectUri(input.redirectUri, allowedUris)) {
          throw SsoErrors.invalidRedirectUri();
        }
      }

      if (!input.session || !input.user) {
        return { status: "unauthenticated" };
      }

      if (app.require_consent) {
        const consent = await consentRepo.findByUserAndApp(
          input.user.id,
          app.id
        );
        if (!consent || consent.revoked_at !== null) {
          const params = new URLSearchParams({ app: app.id });
          if (input.redirectUri) {
            params.set("redirect_uri", input.redirectUri);
          }

          return {
            status: "consent_required",
            app: {
              id: app.id,
              name: app.name,
              description: app.description,
              icon_url: app.icon_url ?? null,
              default_role_name: app.default_role_name ?? null,
              require_consent: app.require_consent,
            },
            consent_url: `${config.authWebUrl}/consent?${params.toString()}`,
          };
        }
      }

      const token = await signNiwaToken(input.user, config.jwtSigning, {
        ttlSeconds: config.accessTokenTtl,
        appId: app.id,
        sessionId: input.session.id,
        amr: input.session.amr,
        emailVerified: Boolean(input.user.email_verified_at),
      });

      return {
        status: "authenticated",
        token,
        expires_in: config.accessTokenTtl,
        user: input.user,
      };
    },

    async submitConsent(input: {
      user: AuthUserResponse;
      appId: string;
      decision: "approve" | "deny";
      redirectUri?: string;
    }): Promise<SsoConsentResponse> {
      await ensureSeeded();

      const app = await appRepo.findById(input.appId);
      if (!app) {
        throw SsoErrors.appNotFound(input.appId);
      }

      if (input.redirectUri) {
        const allowedUris = parseJsonStringArray(app.allowed_redirect_uris);
        if (!isValidRedirectUri(input.redirectUri, allowedUris)) {
          throw SsoErrors.invalidRedirectUri();
        }
      }

      const now = Math.floor(Date.now() / 1000);

      if (input.decision === "approve") {
        await consentRepo.upsertApprove({
          user_id: input.user.id,
          app_id: app.id,
          granted_scopes: JSON.stringify(DEFAULT_GRANTED_SCOPES),
          consented_at: now,
        });

        if (app.default_role_name) {
          const defaultRole = await roleRepo.findByAppAndName(
            app.id,
            app.default_role_name
          );
          if (defaultRole) {
            await roleRepo.assignUserAppRoles([
              {
                user_id: input.user.id,
                app_id: app.id,
                role_id: defaultRole.id,
              },
            ]);
          }
        }

        return {
          approved: true,
          app_id: app.id,
          ...(input.redirectUri ? { redirect_uri: input.redirectUri } : {}),
        };
      }

      await consentRepo.revoke(input.user.id, app.id, now);
      return {
        approved: false,
        app_id: app.id,
        ...(input.redirectUri ? { redirect_uri: input.redirectUri } : {}),
      };
    },

    async logoutSession(sessionId?: string): Promise<void> {
      if (!sessionId) return;
      const now = Math.floor(Date.now() / 1000);
      await idpSessionRepo.revokeById(sessionId, now);
    },
  };
}

export type SsoService = ReturnType<typeof createSsoService>;
