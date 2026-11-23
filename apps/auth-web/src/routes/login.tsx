import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  browserSupportsWebAuthn,
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { loginSchema } from "@niwa/auth-validators";
import {
  Alert,
  Badge,
  Button,
  Divider,
  FormField,
  FullPageLoader,
  PasswordInput,
  TextInput,
} from "@niwa/ui/components";
import { AuthCardLayout } from "../components/auth-card-layout";
import { useAuth } from "../context/auth-context";
import {
  authApi,
  extractApiFieldErrors,
  getErrorMessage,
} from "../lib/auth-api";
import { extractZodFieldErrors } from "../lib/format";
import { buildSsoQueryString, runPostAuthHandoff } from "../lib/sso-handoff";

export default function LoginRoute() {
  const { user, isLoading, setUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const app = searchParams.get("app");
  const redirectUri = searchParams.get("redirect_uri");
  const ssoQuery = buildSsoQueryString(app, redirectUri);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passkeySubmitting, setPasskeySubmitting] = useState(false);
  const [handingOff, setHandingOff] = useState(false);

  const webAuthnSupported =
    typeof window !== "undefined" && browserSupportsWebAuthn();

  const silentHandoffStartedRef = useRef(false);

  // Automatic silent SSO handoff if already signed in
  useEffect(() => {
    if (isLoading || !user || silentHandoffStartedRef.current) return;
    silentHandoffStartedRef.current = true;
    setHandingOff(true);

    runPostAuthHandoff({ app, redirectUri, navigate }).catch((err) => {
      setHandingOff(false);
      setErrorMessage(getErrorMessage(err));
    });
  }, [isLoading, user, app, redirectUri, navigate]);

  if (isLoading || handingOff) {
    return (
      <FullPageLoader
        label={
          handingOff ? "Continuing to application..." : "Checking session..."
        }
      />
    );
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(extractZodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.login(parsed.data);
      setUser(res.user);
      silentHandoffStartedRef.current = true;
      setHandingOff(true);
      await runPostAuthHandoff({ app, redirectUri, navigate });
    } catch (err) {
      setHandingOff(false);
      setFieldErrors(extractApiFieldErrors(err));
      setErrorMessage(getErrorMessage(err, "Unable to sign in."));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setErrorMessage(null);
    setFieldErrors({});
    setPasskeySubmitting(true);

    try {
      const emailHint = email.trim() || undefined;
      const { challenge_id, options } =
        await authApi.startPasskeyLogin(emailHint);

      const assertion = await startAuthentication({
        optionsJSON:
          options as unknown as PublicKeyCredentialRequestOptionsJSON,
      });

      const res = await authApi.verifyPasskeyLogin({
        challenge_id,
        response: assertion as unknown as Record<string, unknown>,
      });

      setUser(res.user);
      silentHandoffStartedRef.current = true;
      setHandingOff(true);
      await runPostAuthHandoff({ app, redirectUri, navigate });
    } catch (err) {
      setHandingOff(false);
      const errName = (err as { name?: string })?.name;
      if (errName === "NotAllowedError" || errName === "AbortError") {
        setErrorMessage("Passkey sign-in was cancelled.");
      } else {
        setErrorMessage(
          getErrorMessage(err, "Unable to sign in with passkey.")
        );
      }
    } finally {
      setPasskeySubmitting(false);
    }
  };

  return (
    <AuthCardLayout
      title="Sign in to Niwa"
      subtitle={
        app
          ? `Sign in to continue to ${app}`
          : "Access your Niwa apps, sessions, and account settings."
      }
      footer={
        <p>
          Don&apos;t have a Niwa account?{" "}
          <Link
            to={`/register${ssoQuery}`}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {app && (
          <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface-muted/70 px-3.5 py-2.5 text-xs">
            <span className="text-muted-foreground">Target application</span>
            <Badge variant="primary" mono>
              {app}
            </Badge>
          </div>
        )}

        {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

        <FormField
          label="Email address"
          htmlFor="login-email"
          error={fieldErrors.email}
          required
        >
          <TextInput
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="next"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={Boolean(fieldErrors.email)}
            disabled={submitting}
            required
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="login-password"
          error={fieldErrors.password}
          required
        >
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            enterKeyHint="done"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={Boolean(fieldErrors.password)}
            disabled={submitting}
            required
          />
          <div className="mt-1.5 flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </FormField>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={submitting || passkeySubmitting}
        >
          {submitting ? "Signing in..." : "Sign in"}
        </Button>

        {webAuthnSupported && (
          <>
            <Divider label="or" />

            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={handlePasskeyLogin}
              disabled={submitting || passkeySubmitting}
            >
              {passkeySubmitting
                ? "Waiting for passkey..."
                : "Sign in with Passkey"}
            </Button>
          </>
        )}
      </form>
    </AuthCardLayout>
  );
}
