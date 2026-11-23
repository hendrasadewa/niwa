import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { resetPasswordSchema } from "@niwa/auth-validators";
import { Alert, Button, FormField, PasswordInput } from "@niwa/ui/components";
import { AuthCardLayout } from "../components/auth-card-layout";
import { useAuth } from "../context/auth-context";
import {
  authApi,
  extractApiFieldErrors,
  getErrorMessage,
} from "../lib/auth-api";
import { extractZodFieldErrors } from "../lib/format";

export default function ResetPasswordRoute() {
  const { setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(
    token
      ? null
      : "Missing reset token. Please open the link from your password reset email."
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    if (newPassword !== confirmPassword) {
      setFieldErrors({
        confirm_password: "Password confirmation does not match",
      });
      return;
    }

    const parsed = resetPasswordSchema.safeParse({
      token,
      new_password: newPassword,
    });
    if (!parsed.success) {
      setFieldErrors(extractZodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.resetPassword(parsed.data);
      setUser(null);
      setSuccessMessage(res.message);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setFieldErrors(extractApiFieldErrors(err));
      setErrorMessage(
        getErrorMessage(
          err,
          "Unable to reset password. The link may have expired."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCardLayout
      title="Set a new password"
      subtitle="Choose a strong password of at least 8 characters. All active sessions will be signed out."
      footer={
        <p>
          Need a new link?{" "}
          <Link
            to="/forgot-password"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Request another reset
          </Link>
        </p>
      }
    >
      {successMessage ? (
        <div className="space-y-4">
          <Alert variant="success">{successMessage}</Alert>
          <Link to="/login" className="block">
            <Button variant="primary" size="lg" className="w-full">
              Sign in with new password
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

          <FormField
            label="New password"
            htmlFor="reset-password"
            hint="Minimum 8 characters"
            error={fieldErrors.new_password}
            required
          >
            <PasswordInput
              id="reset-password"
              name="new_password"
              autoComplete="new-password"
              enterKeyHint="next"
              placeholder="Enter a new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              invalid={Boolean(fieldErrors.new_password)}
              disabled={submitting || !token}
              required
            />
          </FormField>

          <FormField
            label="Confirm new password"
            htmlFor="reset-password-confirm"
            error={fieldErrors.confirm_password}
            required
          >
            <PasswordInput
              id="reset-password-confirm"
              name="confirm_password"
              autoComplete="new-password"
              enterKeyHint="done"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              invalid={Boolean(fieldErrors.confirm_password)}
              disabled={submitting || !token}
              required
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={submitting || !token}
          >
            {submitting ? "Updating password..." : "Reset password"}
          </Button>
        </form>
      )}
    </AuthCardLayout>
  );
}
