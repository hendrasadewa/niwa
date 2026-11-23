import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { forgotPasswordSchema } from "@niwa/auth-validators";
import { Alert, Button, FormField, TextInput } from "@niwa/ui/components";
import { AuthCardLayout } from "../components/auth-card-layout";
import {
  authApi,
  extractApiFieldErrors,
  getErrorMessage,
} from "../lib/auth-api";
import { extractZodFieldErrors } from "../lib/format";

export default function ForgotPasswordRoute() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldErrors(extractZodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.forgotPassword(parsed.data);
      setSuccessMessage(res.message);
    } catch (err) {
      setFieldErrors(extractApiFieldErrors(err));
      setErrorMessage(
        getErrorMessage(err, "Unable to process password reset request.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCardLayout
      title="Forgot your password?"
      subtitle="Enter your email address and we'll send you a link to reset your password."
      footer={
        <p>
          Remembered your password?{" "}
          <Link
            to="/login"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
        {successMessage && <Alert variant="success">{successMessage}</Alert>}

        <FormField
          label="Email address"
          htmlFor="forgot-email"
          error={fieldErrors.email}
          required
        >
          <TextInput
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="send"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={Boolean(fieldErrors.email)}
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
          {submitting ? "Sending reset link..." : "Send reset link"}
        </Button>
      </form>
    </AuthCardLayout>
  );
}
