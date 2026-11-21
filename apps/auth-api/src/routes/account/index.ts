import { Hono, type Context } from "hono";
import { csrfGuard } from "../../middlewares/csrf";
import { requireSessionOrJwtMiddleware } from "../../middlewares/session";
import { createConsentRepo } from "../../repositories/consents";
import { createIdpSessionRepo } from "../../repositories/idp-sessions";
import { createRefreshTokenRepo } from "../../repositories/refresh-tokens";
import { createRoleRepo } from "../../repositories/roles";
import { createUserRepo } from "../../repositories/users";
import { createAccountService } from "../../services/account";
import type { AppEnv } from "../../types/env";
import { buildClearSessionCookie } from "../../utils/cookie";
import { validate } from "../../validators";
import { changePasswordSchema, updateUserSchema } from "../../validators/auth";
import { appIdParamSchema, sessionIdParamSchema } from "../../validators/sso";

function getAccountService(c: Context<AppEnv>) {
  const db = c.get("db");
  return createAccountService({
    userRepo: createUserRepo(db),
    roleRepo: createRoleRepo(db),
    idpSessionRepo: createIdpSessionRepo(db),
    consentRepo: createConsentRepo(db),
    refreshTokenRepo: createRefreshTokenRepo(db),
  });
}

export const accountRoutes = new Hono<AppEnv>();

// Protect mutating routes against CSRF and require an active session or ES256 JWT
accountRoutes.use("*", csrfGuard, requireSessionOrJwtMiddleware);

// GET /api/v1/account/me
accountRoutes.get("/me", (c) => {
  const user = c.get("user")!;
  return c.json({ user });
});

// PUT /api/v1/account/me
accountRoutes.put("/me", validate("json", updateUserSchema), async (c) => {
  const currentUser = c.get("user")!;
  const updates = c.req.valid("json");
  const result = await getAccountService(c).updateProfile({
    currentUser,
    ...updates,
  });
  return c.json(result);
});

// PUT /api/v1/account/password
accountRoutes.put(
  "/password",
  validate("json", changePasswordSchema),
  async (c) => {
    const currentUser = c.get("user")!;
    const currentSession = c.get("idpSession");
    const { current_password, new_password, revoke_other_sessions } =
      c.req.valid("json");
    const result = await getAccountService(c).changePassword({
      currentUser,
      currentPassword: current_password,
      newPassword: new_password,
      currentSessionId: currentSession?.id,
      revokeOtherSessions: revoke_other_sessions,
    });
    return c.json({
      message: "Password updated successfully",
      ...result,
    });
  }
);

// GET /api/v1/account/sessions
accountRoutes.get("/sessions", async (c) => {
  const user = c.get("user")!;
  const currentSession = c.get("idpSession");
  const sessions = await getAccountService(c).listSessions(
    user.id,
    currentSession?.id
  );
  return c.json({ sessions });
});

// POST /api/v1/account/sessions/revoke-all
accountRoutes.post("/sessions/revoke-all", async (c) => {
  const user = c.get("user")!;
  const revokedCount = await getAccountService(c).revokeAllSessions(user.id);
  c.header("Set-Cookie", buildClearSessionCookie(c.req.url));
  return c.json({
    message: "All sessions revoked",
    revoked_sessions: revokedCount,
  });
});

// DELETE /api/v1/account/sessions/:id
accountRoutes.delete(
  "/sessions/:id",
  validate("param", sessionIdParamSchema),
  async (c) => {
    const user = c.get("user")!;
    const currentSession = c.get("idpSession");
    const { id } = c.req.valid("param");
    await getAccountService(c).revokeSession(user.id, id);

    if (currentSession && currentSession.id === id) {
      c.header("Set-Cookie", buildClearSessionCookie(c.req.url));
    }

    return c.json({ message: "Session revoked" });
  }
);

// GET /api/v1/account/apps
accountRoutes.get("/apps", async (c) => {
  const user = c.get("user")!;
  const apps = await getAccountService(c).listConnectedApps(user.id);
  return c.json({ apps });
});

// DELETE /api/v1/account/apps/:appId
accountRoutes.delete(
  "/apps/:appId",
  validate("param", appIdParamSchema),
  async (c) => {
    const user = c.get("user")!;
    const { appId } = c.req.valid("param");
    await getAccountService(c).revokeAppConsent(user.id, appId);
    return c.json({ message: "App consent revoked", app_id: appId });
  }
);
