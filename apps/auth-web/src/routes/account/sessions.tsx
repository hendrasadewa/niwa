import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
} from "@niwa/ui/components";
import { useAuth } from "../../context/auth-context";
import {
  authApi,
  getErrorMessage,
  type AccountSession,
} from "../../lib/auth-api";
import {
  formatRelativeUnix,
  formatUnixDate,
  summarizeUserAgent,
} from "../../lib/format";

export default function AccountSessionsRoute() {
  const { clearLocalSession } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

  const loadSessions = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { sessions: list } = await authApi.listSessions(signal);
      setSessions(list);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setErrorMessage(getErrorMessage(err, "Failed to load active sessions."));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadSessions(controller.signal);
    return () => controller.abort();
  }, [loadSessions]);

  const handleRevokeSession = async (session: AccountSession) => {
    setRevokingId(session.id);
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      await authApi.revokeSession(session.id);
      if (session.is_current) {
        clearLocalSession();
        navigate("/login", { replace: true });
        return;
      }
      setSessions((prev) => prev.filter((item) => item.id !== session.id));
      setFeedbackMessage("Session revoked successfully.");
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to revoke session."));
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAll = async () => {
    setRevokingAll(true);
    setErrorMessage(null);
    try {
      await authApi.revokeAllSessions();
      clearLocalSession();
      navigate("/login", { replace: true });
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to revoke all sessions."));
      setRevokingAll(false);
      setConfirmRevokeAll(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        kicker="Account"
        title="Active Sessions"
        description="Devices and browsers currently signed in to your Niwa identity. Revoking a session signs that device out across all Niwa apps."
        actions={
          sessions.length > 0 &&
          (confirmRevokeAll ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={revokingAll}
                onClick={() => setConfirmRevokeAll(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={revokingAll}
                onClick={handleRevokeAll}
              >
                {revokingAll ? "Signing out..." : "Confirm Sign Out All"}
              </Button>
            </>
          ) : (
            <Button
              variant="danger"
              size="md"
              onClick={() => setConfirmRevokeAll(true)}
            >
              Sign Out All Devices
            </Button>
          ))
        }
      />

      {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
      {feedbackMessage && <Alert variant="success">{feedbackMessage}</Alert>}

      <Card
        title={`Signed-in devices (${sessions.length})`}
        description="Sessions expire automatically after inactivity or when explicitly revoked."
        actions={
          <Button
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => loadSessions()}
          >
            Refresh
          </Button>
        }
      >
        {loading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Loading active sessions...
          </p>
        ) : sessions.length === 0 ? (
          <EmptyState
            title="No active sessions"
            description="Active sign-in sessions will appear here."
          />
        ) : (
          <div className="divide-y divide-border">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {summarizeUserAgent(session.user_agent)}
                    </p>
                    {session.is_current && (
                      <Badge variant="success" dot>
                        Current session
                      </Badge>
                    )}
                    {session.amr.map((method) => (
                      <Badge key={method} variant="neutral" mono>
                        {method}
                      </Badge>
                    ))}
                  </div>

                  {session.user_agent && (
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {session.user_agent}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span>
                      IP:{" "}
                      <span className="font-mono text-foreground">
                        {session.ip_address ?? "Unknown"}
                      </span>
                    </span>
                    <span>
                      Last active:{" "}
                      <span className="text-foreground">
                        {formatRelativeUnix(session.last_seen_at)}
                      </span>
                    </span>
                    <span>
                      Signed in:{" "}
                      <span className="text-foreground">
                        {formatUnixDate(session.created_at)}
                      </span>
                    </span>
                    <span>
                      Expires:{" "}
                      <span className="text-foreground">
                        {formatUnixDate(session.expires_at)}
                      </span>
                    </span>
                  </div>
                </div>

                <Button
                  variant={session.is_current ? "danger" : "secondary"}
                  size="sm"
                  disabled={revokingId === session.id}
                  onClick={() => handleRevokeSession(session)}
                >
                  {revokingId === session.id
                    ? "Revoking..."
                    : session.is_current
                      ? "Sign Out This Device"
                      : "Revoke"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
