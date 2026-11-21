import { createMiddleware } from "hono/factory";
import { SsoErrors } from "../errors/sso";
import type { AppEnv } from "../types/env";
import { isAuthWebOrigin } from "../utils/origin";
import { isRequestOriginAllowed } from "./cors";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ALLOWED_FETCH_SITES = new Set(["same-origin", "same-site", "none"]);

/**
 * CSRF defense for cookie-authenticated mutating endpoints:
 * - Requires custom header `X-Niwa-Requested-With: fetch`
 * - Requires `Content-Type: application/json` when a request body is present
 * - Rejects cross-site `Sec-Fetch-Site`
 * - Validates `Origin` against the Niwa allowlist whenever present
 */
export const csrfGuard = createMiddleware<AppEnv>(async (c, next) => {
  if (!MUTATING_METHODS.has(c.req.method)) {
    await next();
    return;
  }

  const requestedWith = c.req.header("X-Niwa-Requested-With");
  if (requestedWith !== "fetch") {
    throw SsoErrors.csrfValidationFailed(
      "Missing or invalid X-Niwa-Requested-With header"
    );
  }

  const contentLength = Number.parseInt(
    c.req.header("Content-Length") ?? "0",
    10
  );
  const contentType = c.req.header("Content-Type") ?? "";
  if (
    contentLength > 0 &&
    !contentType.toLowerCase().includes("application/json")
  ) {
    throw SsoErrors.csrfValidationFailed(
      "Content-Type must be application/json"
    );
  }

  const fetchSite = c.req.header("Sec-Fetch-Site")?.toLowerCase();
  if (fetchSite && !ALLOWED_FETCH_SITES.has(fetchSite)) {
    throw SsoErrors.csrfValidationFailed(
      "Cross-site mutating requests are forbidden"
    );
  }

  const origin = c.req.header("Origin");
  if (origin) {
    const allowed = await isRequestOriginAllowed(c, origin);
    if (!allowed) {
      throw SsoErrors.originNotAllowed();
    }
  }

  await next();
});

/**
 * Restricts an endpoint (e.g. POST /api/v1/sso/consent) to calls originating
 * from the hosted Niwa Auth Portal (`auth.hendrasadewa.com`).
 */
export const requireAuthWebOrigin = createMiddleware<AppEnv>(
  async (c, next) => {
    const origin = c.req.header("Origin");
    if (origin && !isAuthWebOrigin(origin, c.env.AUTH_WEB_URL)) {
      throw SsoErrors.consentPortalOnly();
    }
    await next();
  }
);
