import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { registerSchema } from "@niwa/auth-validators";
import {
  Alert,
  Badge,
  Button,
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

export default function RegisterRoute() {
  const { user, isLoading, setUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const app = searchParams.get("app");
  const redirectUri = searchParams.get("redirect_uri");
  const ssoQuery = buildSsoQueryString(app, redirectUri);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [handingOff, setHandingOff] = useState(false);

  const silentHandoffStartedRef = useRef(false);

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

    const payload = {
      name,
      email,
      password,
      ...(whatsappNumber.trim()
        ? { whatsapp_number: whatsappNumber.trim() }
        : {}),
    };

    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(extractZodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.register(parsed.data);
      setUser(res.user);
      silentHandoffStartedRef.current = true;
      setHandingOff(true);
      await runPostAuthHandoff({ app, redirectUri, navigate });
    } catch (err) {
      setHandingOff(false);
      setFieldErrors(extractApiFieldErrors(err));
      setErrorMessage(getErrorMessage(err, "Unable to create account."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCardLayout
      title="Create your Niwa account"
      subtitle={
        app
          ? `Create an account to continue to ${app}`
          : "One account for every Niwa product."
      }
      footer={
        <p>
          Already have an account?{" "}
          <Link
            to={`/login${ssoQuery}`}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Sign in
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
          label="Full name"
          htmlFor="register-name"
          error={fieldErrors.name}
          required
        >
          <TextInput
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            enterKeyHint="next"
            placeholder="Hendra Sadewa"
            value={name}
            onChange={(e) => setName(e.target.value)}
            invalid={Boolean(fieldErrors.name)}
            disabled={submitting}
            required
          />
        </FormField>

        <FormField
          label="Email address"
          htmlFor="register-email"
          error={fieldErrors.email}
          required
        >
          <TextInput
            id="register-email"
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
          label="WhatsApp number"
          htmlFor="register-whatsapp"
          hint="Optional"
          error={fieldErrors.whatsapp_number}
        >
          <TextInput
            id="register-whatsapp"
            name="whatsapp_number"
            type="tel"
            autoComplete="tel"
            enterKeyHint="next"
            placeholder="08123456789"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            invalid={Boolean(fieldErrors.whatsapp_number)}
            disabled={submitting}
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="register-password"
          hint="Min. 8 characters"
          error={fieldErrors.password}
          required
        >
          <PasswordInput
            id="register-password"
            name="password"
            autoComplete="new-password"
            enterKeyHint="done"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={Boolean(fieldErrors.password)}
            disabled={submitting}
            required
          />
        </FormField>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthCardLayout>
  );
}
