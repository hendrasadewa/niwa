import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Alert, Badge, Button } from "@niwa/ui/components";
import { AuthCardLayout } from "../components/auth-card-layout";
import { FullPageLoader } from "../components/form-controls";
import { useAuth } from "../context/auth-context";
import {
  authApi,
  getErrorMessage,
  type SsoAppMetadata,
} from "../lib/auth-api";
import { buildSsoQueryString } from "../lib/sso-handoff";

const REQUESTED_SCOPES = [
  {
    name: "profile",
    label: "Basic profile",
    detail: "Your display name and WhatsApp number",
  },
  {
    name: "email",
    label: "Email address",
    detail: "Your primary Niwa account email",
  },
  {
    name: "roles",
    label: "App roles & permissions",
    detail: "Access level assigned to you for this application",
  },
];

export default function ConsentRoute() {
  const { user, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const appId = searchParams.get("app");
  const redirectUri = searchParams.get("redirect_uri");
  const ssoQuery = buildSsoQueryString(appId, redirectUri);

  const [appMeta, setAppMeta] = useState<SsoAppMetadata | null>(null);
  const [checking, setChecking] = useState(true);
  const [submittingDecision, setSubmittingDecision] = useState<
    "approve" | "deny" | null
  >(null);
  const [denied, setDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redirect unauthenticated visitors to /login with preserved params
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate(`/login${ssoQuery}`, { replace: true });
    }
  }, [isLoading, user, ssoQuery, navigate]);

  // Validate app_id & redirect_uri via POST /api/v1/sso/token
  useEffect(() => {
    if (isLoading || !user) return;
    if (!appId) {
      setChecking(false);
      setErrorMessage("Missing target application (?app=...) in request.");
      return;
    }

    const controller = new AbortController();
    setChecking(true);
    setErrorMessage(null);

    authApi
      .exchangeSsoToken(
        {
          app_id: appId,
          ...(redirectUri ? { redirect_uri: redirectUri } : {}),
        },
        controller.signal
      )
      .then((res) => {
        if (controller.signal.aborted) return;

        if (res.status === "unauthenticated") {
          navigate(`/login${ssoQuery}`, { replace: true });
          return;
        }

        if (res.status === "authenticated") {
          if (redirectUri) {
            // Safe: auth-api validated redirect_uri above
            window.location.href = redirectUri;
          } else {
            navigate("/account", { replace: true });
          }
          return;
        }

        setAppMeta(res.app);
        setChecking(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setErrorMessage(getErrorMessage(err, "Unable to verify consent request."));
        setChecking(false);
      });

    return () => controller.abort();
  }, [isLoading, user, appId, redirectUri, ssoQuery, navigate]);

  if (isLoading || (user && checking)) {
    return <FullPageLoader label="Preparing authorization..." />;
  }

  if (!user) {
    return <FullPageLoader label="Redirecting to sign in..." />;
  }

  const handleDecision = async (decision: "approve" | "deny") => {
    if (!appId) return;
    setSubmittingDecision(decision);
    setErrorMessage(null);

    try {
      const res = await authApi.submitSsoConsent({
        app_id: appId,
        decision,
        ...(redirectUri ? { redirect_uri: redirectUri } : {}),
      });

      if (res.approved) {
        if (res.redirect_uri) {
          // Safe: returned and validated by auth-api
          window.location.href = res.redirect_uri;
        } else {
          navigate("/account", { replace: true });
        }
      } else {
        setDenied(true);
      }
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to record consent decision."));
    } finally {
      setSubmittingDecision(null);
    }
  };

  const handleSwitchAccount = async () => {
    await signOut();
    navigate(`/login${ssoQuery}`, { replace: true });
  };

  if (errorMessage && !appMeta) {
    return (
      <AuthCardLayout
        title="Authorization error"
        subtitle="We couldn't complete this sign-in request."
      >
        <div className="space-y-4">
          <Alert variant="error">{errorMessage}</Alert>
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            onClick={() => navigate("/account")}
          >
            Go to Niwa Account
          </Button>
        </div>
      </AuthCardLayout>
    );
  }

  if (denied && appMeta) {
    return (
      <AuthCardLayout
        title="Access cancelled"
        subtitle={`You chose not to grant access to ${appMeta.name}.`}
      >
        <div className="space-y-4">
          <Alert variant="info">
            No permissions were granted to <strong>{appMeta.name}</strong>. You
            can return to your Niwa account at any time.
          </Alert>
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={() => navigate("/account", { replace: true })}
          >
            Go to Niwa Account
          </Button>
        </div>
      </AuthCardLayout>
    );
  }

  return (
    <AuthCardLayout
      title={`Continue to ${appMeta?.name ?? appId}`}
      subtitle={appMeta?.description}
      footer={
        <button
          type="button"
          onClick={handleSwitchAccount}
          className="text-neutral-400 hover:text-neutral-200 underline underline-offset-4 cursor-pointer"
        >
          Not {user.email}? Switch account
        </button>
      }
    >
      <div className="space-y-5">
        {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

        {/* App & User Summary */}
        <div className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950/70 p-3">
          {appMeta?.icon_url ? (
            <img
              src={appMeta.icon_url}
              alt={appMeta.name}
              className="h-10 w-10 rounded-lg border border-neutral-800 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-sm font-semibold uppercase text-emerald-400">
              {(appMeta?.name ?? appId ?? "A").slice(0, 2)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-neutral-100">
                {appMeta?.name}
              </p>
              <Badge variant="neutral" mono>
                {appMeta?.id}
              </Badge>
            </div>
            <p className="truncate text-xs text-neutral-400">
              Signed in as <span className="text-neutral-200">{user.email}</span>
            </p>
          </div>
        </div>

        {/* Requested Scopes */}
        <div className="space-y-2.5">
          <p className="text-xs font-medium text-neutral-300">
            This Niwa application is requesting access to:
          </p>
          <ul className="space-y-2 rounded-lg border border-neutral-800/80 bg-neutral-950/50 p-3">
            {REQUESTED_SCOPES.map((scope) => (
              <li key={scope.name} className="flex items-start gap-2.5 text-xs">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-200">
                      {scope.label}
                    </span>
                    <Badge variant="neutral" mono>
                      {scope.name}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    {scope.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {appMeta?.default_role_name && (
            <p className="text-[11px] text-neutral-400">
              Default role assigned on approval:{" "}
              <Badge variant="success" mono>
                {appMeta.default_role_name}
              </Badge>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button
            variant="secondary"
            size="md"
            className="flex-1 py-2 text-sm"
            disabled={submittingDecision !== null}
            onClick={() => handleDecision("deny")}
          >
            {submittingDecision === "deny" ? "Cancelling..." : "Cancel"}
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1 py-2 text-sm"
            disabled={submittingDecision !== null}
            onClick={() => handleDecision("approve")}
          >
            {submittingDecision === "approve" ? "Allowing..." : "Allow"}
          </Button>
        </div>
      </div>
    </AuthCardLayout>
  );
}
