import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { loginSchema } from "@niwa/auth-validators";
import { Alert, Badge, Button } from "@niwa/ui/components";
import { AuthCardLayout } from "../components/auth-card-layout";
import {
  FormField,
  FullPageLoader,
  TextInput,
} from "../components/form-controls";
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
  const [handingOff, setHandingOff] = useState(false);

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
        label={handingOff ? "Continuing to application..." : "Checking session..."}
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
            className="font-medium text-emerald-400 hover:text-emerald-300"
          >
            Create one
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {app && (
          <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-xs">
            <span className="text-neutral-400">Target application</span>
            <Badge variant="info" mono>
              {app}
            </Badge>
          </div>
        )}

        {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

        <FormField
          label="Email address"
          htmlFor="login-email"
          error={fieldErrors.email}
        >
          <TextInput
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            required
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="login-password"
          error={fieldErrors.password}
        >
          <TextInput
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            required
          />
          <div className="mt-1.5 flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
            >
              Forgot password?
            </Link>
          </div>
        </FormField>

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full py-2 text-sm"
          disabled={submitting}
        >
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthCardLayout>
  );
}
