import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Alert, Button, Spinner } from "@niwa/ui/components";
import { AuthCardLayout } from "../components/auth-card-layout";
import { useAuth } from "../context/auth-context";
import { authApi, getErrorMessage } from "../lib/auth-api";

export default function VerifyEmailRoute() {
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    token ? "verifying" : "error"
  );
  const [message, setMessage] = useState<string>(
    token
      ? "Verifying your email address..."
      : "Missing verification token. Please use the link from your email."
  );

  const startedRef = useRef(false);

  useEffect(() => {
    if (!token || startedRef.current) return;
    startedRef.current = true;

    authApi
      .verifyEmail({ token })
      .then(async (res) => {
        setStatus("success");
        setMessage(res.message || "Your email address has been verified.");
        if (user) {
          await refreshUser().catch(() => undefined);
        }
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          getErrorMessage(
            err,
            "This verification link is invalid or has expired."
          )
        );
      });
  }, [token, user, refreshUser]);

  return (
    <AuthCardLayout
      title="Email verification"
      subtitle="Confirming your Niwa account email address."
    >
      <div className="space-y-4">
        {status === "verifying" && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface-muted px-4 py-3 text-sm text-foreground"
          >
            <Spinner size="sm" />
            <span>{message}</span>
          </div>
        )}

        {status === "success" && <Alert variant="success">{message}</Alert>}
        {status === "error" && <Alert variant="error">{message}</Alert>}

        <div className="flex flex-col gap-2 pt-1">
          <Link to={user ? "/account" : "/login"} className="block">
            <Button variant="primary" size="lg" className="w-full">
              {user ? "Go to Account" : "Sign in to Niwa"}
            </Button>
          </Link>
        </div>
      </div>
    </AuthCardLayout>
  );
}
