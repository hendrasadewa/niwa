import { AppError } from "./app-error";

export const SsoErrors = {
  appNotFound: (appId: string) =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "SSO_APP_NOT_FOUND",
      message: `Application '${appId}' is not registered`,
    }),

  invalidRedirectUri: () =>
    new AppError({
      status: 400,
      error: "BadRequest",
      code: "SSO_INVALID_REDIRECT_URI",
      message: "Redirect URI is not allowed for this application",
    }),

  originNotAllowed: () =>
    new AppError({
      status: 403,
      error: "Forbidden",
      code: "SSO_ORIGIN_NOT_ALLOWED",
      message: "Request origin is not in the Niwa allowlist",
    }),

  csrfValidationFailed: (
    message = "CSRF validation failed: missing required headers or invalid origin"
  ) =>
    new AppError({
      status: 403,
      error: "Forbidden",
      code: "SSO_CSRF_VALIDATION_FAILED",
      message,
    }),

  consentPortalOnly: () =>
    new AppError({
      status: 403,
      error: "Forbidden",
      code: "SSO_CONSENT_PORTAL_ONLY",
      message: "Consent decisions may only be submitted from the Niwa Auth Portal",
    }),

  sessionRequired: () =>
    new AppError({
      status: 401,
      error: "Unauthorized",
      code: "SSO_SESSION_REQUIRED",
      message: "An active Niwa IdP session is required",
    }),

  sessionNotFound: () =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "ACCOUNT_SESSION_NOT_FOUND",
      message: "Session not found",
    }),

  consentNotFound: (appId: string) =>
    new AppError({
      status: 404,
      error: "NotFound",
      code: "ACCOUNT_APP_CONSENT_NOT_FOUND",
      message: `No active consent found for app '${appId}'`,
    }),

  signingKeyInvalid: () =>
    new AppError({
      status: 500,
      error: "Internal Server Error",
      code: "JWT_SIGNING_KEY_INVALID",
      message: "Identity Provider signing key configuration is invalid",
    }),
};
