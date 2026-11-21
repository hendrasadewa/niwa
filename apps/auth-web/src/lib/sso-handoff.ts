import type { NavigateFunction } from "react-router";
import { authApi } from "./auth-api";

export interface SsoHandoffParams {
  app: string | null;
  redirectUri: string | null;
  navigate: NavigateFunction;
}

export function buildSsoQueryString(
  app: string | null,
  redirectUri: string | null
): string {
  const params = new URLSearchParams();
  if (app) params.set("app", app);
  if (redirectUri) params.set("redirect_uri", redirectUri);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Executes the post-login / post-register SSO handoff:
 * - If `app` is present, validates `redirect_uri` and checks consent via POST /api/v1/sso/token.
 *   - `consent_required` -> navigate to /consent?app=...&redirect_uri=...
 *   - `authenticated` + `redirect_uri` -> browser redirect to the validated redirect_uri
 *   - `authenticated` without `redirect_uri` -> navigate to /account
 *   - `unauthenticated` -> returns "unauthenticated" so caller stays on auth page
 * - If `app` is absent -> navigate to /account.
 */
export async function runPostAuthHandoff({
  app,
  redirectUri,
  navigate,
}: SsoHandoffParams): Promise<"redirected" | "unauthenticated"> {
  if (!app) {
    navigate("/account", { replace: true });
    return "redirected";
  }

  const res = await authApi.exchangeSsoToken({
    app_id: app,
    ...(redirectUri ? { redirect_uri: redirectUri } : {}),
  });

  if (res.status === "consent_required") {
    navigate(`/consent${buildSsoQueryString(app, redirectUri)}`, {
      replace: true,
    });
    return "redirected";
  }

  if (res.status === "authenticated") {
    if (redirectUri) {
      // Safe: auth-api validated `redirect_uri` against apps.allowed_redirect_uris above.
      window.location.href = redirectUri;
    } else {
      navigate("/account", { replace: true });
    }
    return "redirected";
  }

  return "unauthenticated";
}
