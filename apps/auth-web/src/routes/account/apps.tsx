import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Button, EmptyState } from "@niwa/ui/components";
import { Card } from "../../components/form-controls";
import {
  authApi,
  getErrorMessage,
  type ConnectedApp,
} from "../../lib/auth-api";
import { formatUnixDate } from "../../lib/format";

export default function AccountAppsRoute() {
  const [apps, setApps] = useState<ConnectedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [confirmAppId, setConfirmAppId] = useState<string | null>(null);
  const [revokingAppId, setRevokingAppId] = useState<string | null>(null);

  const loadApps = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { apps: list } = await authApi.listConnectedApps(signal);
      setApps(list);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setErrorMessage(getErrorMessage(err, "Failed to load connected apps."));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadApps(controller.signal);
    return () => controller.abort();
  }, [loadApps]);

  const handleRevoke = async (app: ConnectedApp) => {
    setRevokingAppId(app.app_id);
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      await authApi.revokeAppConsent(app.app_id);
      setApps((prev) => prev.filter((item) => item.app_id !== app.app_id));
      setConfirmAppId(null);
      setFeedbackMessage(`Revoked access for ${app.name}.`);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to revoke app access."));
    } finally {
      setRevokingAppId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-100">
          Connected Niwa Apps
        </h1>
        <p className="mt-1 text-xs text-neutral-400">
          Applications you have authorized to sign in with your Niwa account.
          Revoking access will prompt you for consent again on your next visit.
        </p>
      </div>

      {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
      {feedbackMessage && <Alert variant="success">{feedbackMessage}</Alert>}

      <Card
        title={`Authorized applications (${apps.length})`}
        actions={
          <Button
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => loadApps()}
          >
            Refresh
          </Button>
        }
      >
        {loading ? (
          <p className="py-6 text-center text-xs text-neutral-500">
            Loading connected applications...
          </p>
        ) : apps.length === 0 ? (
          <EmptyState
            title="No connected applications yet"
            description="When you approve a Niwa app on the consent screen, it will appear here."
          />
        ) : (
          <div className="divide-y divide-neutral-800/80">
            {apps.map((app) => {
              const isConfirming = confirmAppId === app.app_id;
              const isRevoking = revokingAppId === app.app_id;

              return (
                <div
                  key={app.app_id}
                  className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {app.icon_url ? (
                      <img
                        src={app.icon_url}
                        alt={app.name}
                        className="h-10 w-10 shrink-0 rounded-lg border border-neutral-800 object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-xs font-semibold uppercase text-emerald-400">
                        {app.name.slice(0, 2)}
                      </div>
                    )}

                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-neutral-100">
                          {app.name}
                        </p>
                        <Badge variant="neutral" mono>
                          {app.app_id}
                        </Badge>
                      </div>

                      <p className="text-xs text-neutral-400">
                        {app.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-neutral-500">
                          Scopes:
                        </span>
                        {app.granted_scopes.length > 0 ? (
                          app.granted_scopes.map((scope) => (
                            <Badge key={scope} variant="neutral" mono>
                              {scope}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[11px] text-neutral-500">
                            None
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-neutral-500">
                          Roles:
                        </span>
                        {app.roles.length > 0 ? (
                          app.roles.map((role) => (
                            <Badge key={role} variant="info" mono>
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[11px] text-neutral-500">
                            No roles assigned
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-neutral-500">
                        Consented on {formatUnixDate(app.consented_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isConfirming ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isRevoking}
                          onClick={() => setConfirmAppId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={isRevoking}
                          onClick={() => handleRevoke(app)}
                        >
                          {isRevoking ? "Revoking..." : "Confirm Revoke"}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setConfirmAppId(app.app_id)}
                      >
                        Revoke Access
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
