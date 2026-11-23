import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createAppSchema, updateAppSchema } from "@niwa/auth-validators";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  FormField,
  PageHeader,
  TextArea,
  TextInput,
} from "@niwa/ui/components";
import { useAuth } from "../../context/auth-context";
import {
  authApi,
  extractApiFieldErrors,
  getErrorMessage,
  type AppWithRbac,
} from "../../lib/auth-api";
import { extractZodFieldErrors, parseMultilineList } from "../../lib/format";

interface AppFormState {
  id: string;
  name: string;
  description: string;
  allowedOriginsText: string;
  allowedRedirectUrisText: string;
  defaultRoleName: string;
  requireConsent: boolean;
  iconUrl: string;
}

const EMPTY_FORM: AppFormState = {
  id: "",
  name: "",
  description: "",
  allowedOriginsText: "",
  allowedRedirectUrisText: "",
  defaultRoleName: "member",
  requireConsent: true,
  iconUrl: "",
};

function appToFormState(app: AppWithRbac): AppFormState {
  return {
    id: app.id,
    name: app.name,
    description: app.description,
    allowedOriginsText: app.allowed_origins.join("\n"),
    allowedRedirectUrisText: app.allowed_redirect_uris.join("\n"),
    defaultRoleName: app.default_role_name ?? "",
    requireConsent: app.require_consent,
    iconUrl: app.icon_url ?? "",
  };
}

export default function AdminAppsRoute() {
  const { getAdminToken } = useAuth();

  const [apps, setApps] = useState<AppWithRbac[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [mode, setMode] = useState<"closed" | "create" | "edit">("closed");
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [form, setForm] = useState<AppFormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadApps = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const token = await getAdminToken();
      const { apps: list } = await authApi.listApps(token);
      setApps(list);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to load applications."));
    } finally {
      setLoading(false);
    }
  }, [getAdminToken]);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  const openCreate = () => {
    setMode("create");
    setEditingAppId(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setErrorMessage(null);
    setFeedbackMessage(null);
  };

  const openEdit = (app: AppWithRbac) => {
    setMode("edit");
    setEditingAppId(app.id);
    setForm(appToFormState(app));
    setFieldErrors({});
    setErrorMessage(null);
    setFeedbackMessage(null);
  };

  const closeForm = () => {
    setMode("closed");
    setEditingAppId(null);
    setFieldErrors({});
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setFeedbackMessage(null);
    setFieldErrors({});

    const allowedOrigins = parseMultilineList(form.allowedOriginsText);
    const allowedRedirectUris = parseMultilineList(
      form.allowedRedirectUrisText
    );
    const defaultRoleName = form.defaultRoleName.trim() || null;
    const iconUrl = form.iconUrl.trim() || null;

    setSaving(true);
    try {
      const token = await getAdminToken();

      if (mode === "create") {
        const parsed = createAppSchema.safeParse({
          id: form.id,
          name: form.name,
          description: form.description,
          allowed_origins: allowedOrigins,
          allowed_redirect_uris: allowedRedirectUris,
          default_role_name: defaultRoleName,
          require_consent: form.requireConsent,
          icon_url: iconUrl,
        });

        if (!parsed.success) {
          setFieldErrors(extractZodFieldErrors(parsed.error));
          setSaving(false);
          return;
        }

        const { app } = await authApi.createApp(token, parsed.data);
        setApps((prev) => [...prev, app]);
        setFeedbackMessage(`Created app "${app.name}" (${app.id}).`);
        closeForm();
      } else if (mode === "edit" && editingAppId) {
        const parsed = updateAppSchema.safeParse({
          name: form.name,
          description: form.description,
          allowed_origins: allowedOrigins,
          allowed_redirect_uris: allowedRedirectUris,
          default_role_name: defaultRoleName,
          require_consent: form.requireConsent,
          icon_url: iconUrl,
        });

        if (!parsed.success) {
          setFieldErrors(extractZodFieldErrors(parsed.error));
          setSaving(false);
          return;
        }

        const { app } = await authApi.updateApp(
          token,
          editingAppId,
          parsed.data
        );
        setApps((prev) =>
          prev.map((item) => (item.id === app.id ? app : item))
        );
        setFeedbackMessage(`Updated SSO settings for "${app.name}".`);
        closeForm();
      }
    } catch (err) {
      setFieldErrors(extractApiFieldErrors(err));
      setErrorMessage(getErrorMessage(err, "Failed to save application."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        kicker="Admin ACL"
        title="Apps Registry"
        description="Manage first-party Niwa applications, allowed CORS origins, redirect URIs, and consent defaults."
        actions={
          <Button variant="primary" size="md" onClick={openCreate}>
            + Register App
          </Button>
        }
      />

      {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
      {feedbackMessage && <Alert variant="success">{feedbackMessage}</Alert>}

      {/* Create / Edit Card */}
      {mode !== "closed" && (
        <Card
          title={
            mode === "create"
              ? "Register New Application"
              : `Edit Application: ${editingAppId}`
          }
          description={
            mode === "create"
              ? "New apps automatically receive default admin and member roles."
              : "Update SSO origins, redirect URI allowlist, and consent policy."
          }
          actions={
            <Button variant="ghost" size="sm" onClick={closeForm}>
              Close
            </Button>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="App ID"
                htmlFor="app-id"
                hint="Lowercase slug (e.g. pustaka)"
                error={fieldErrors.id}
                required
              >
                <TextInput
                  id="app-id"
                  name="id"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={form.id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, id: e.target.value }))
                  }
                  invalid={Boolean(fieldErrors.id)}
                  disabled={mode === "edit" || saving}
                  placeholder="my-app"
                  required
                />
              </FormField>

              <FormField
                label="Display Name"
                htmlFor="app-name"
                error={fieldErrors.name}
                required
              >
                <TextInput
                  id="app-name"
                  name="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  invalid={Boolean(fieldErrors.name)}
                  disabled={saving}
                  placeholder="My Niwa App"
                  required
                />
              </FormField>
            </div>

            <FormField
              label="Description"
              htmlFor="app-description"
              error={fieldErrors.description}
              required
            >
              <TextInput
                id="app-description"
                name="description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                invalid={Boolean(fieldErrors.description)}
                disabled={saving}
                placeholder="Shown to users on the consent screen"
                required
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Allowed Origins"
                htmlFor="app-origins"
                hint="One URL per line"
                error={fieldErrors.allowed_origins}
              >
                <TextArea
                  id="app-origins"
                  name="allowed_origins"
                  mono
                  spellCheck={false}
                  value={form.allowedOriginsText}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      allowedOriginsText: e.target.value,
                    }))
                  }
                  invalid={Boolean(fieldErrors.allowed_origins)}
                  disabled={saving}
                  placeholder={
                    "https://app.hendrasadewa.com\nhttp://localhost:3001"
                  }
                />
              </FormField>

              <FormField
                label="Allowed Redirect URIs"
                htmlFor="app-redirects"
                hint="One URL per line"
                error={fieldErrors.allowed_redirect_uris}
              >
                <TextArea
                  id="app-redirects"
                  name="allowed_redirect_uris"
                  mono
                  spellCheck={false}
                  value={form.allowedRedirectUrisText}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      allowedRedirectUrisText: e.target.value,
                    }))
                  }
                  invalid={Boolean(fieldErrors.allowed_redirect_uris)}
                  disabled={saving}
                  placeholder={
                    "https://app.hendrasadewa.com/\nhttp://localhost:3001/"
                  }
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Default Role Name"
                htmlFor="app-default-role"
                hint="Assigned on consent approval (optional)"
                error={fieldErrors.default_role_name}
              >
                <TextInput
                  id="app-default-role"
                  name="default_role_name"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={form.defaultRoleName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, defaultRoleName: e.target.value }))
                  }
                  invalid={Boolean(fieldErrors.default_role_name)}
                  disabled={saving}
                  placeholder="member"
                />
              </FormField>

              <FormField
                label="Icon URL"
                htmlFor="app-icon-url"
                hint="Optional"
                error={fieldErrors.icon_url}
              >
                <TextInput
                  id="app-icon-url"
                  name="icon_url"
                  type="url"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={form.iconUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, iconUrl: e.target.value }))
                  }
                  invalid={Boolean(fieldErrors.icon_url)}
                  disabled={saving}
                  placeholder="https://..."
                />
              </FormField>
            </div>

            <Checkbox
              card
              checked={form.requireConsent}
              onChange={(e) =>
                setForm((f) => ({ ...f, requireConsent: e.target.checked }))
              }
              disabled={saving}
              label="Require explicit first-time consent"
              description="Prompt users on /consent before issuing app tokens for the first time."
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="secondary"
                size="md"
                disabled={saving}
                onClick={closeForm}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : mode === "create"
                    ? "Create App"
                    : "Save Settings"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Apps List */}
      <Card
        title={`Registered Applications (${apps.length})`}
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
          <p className="py-6 text-center text-xs text-muted-foreground">
            Loading applications...
          </p>
        ) : apps.length === 0 ? (
          <EmptyState
            title="No applications registered"
            description="Register your first Niwa application to configure SSO and RBAC."
          />
        ) : (
          <div className="divide-y divide-border">
            {apps.map((app) => (
              <div
                key={app.id}
                className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-serif text-base font-medium text-foreground">
                      {app.name}
                    </p>
                    <Badge variant="primary" mono>
                      {app.id}
                    </Badge>
                    <Badge
                      variant={app.require_consent ? "warning" : "neutral"}
                    >
                      {app.require_consent ? "Consent Required" : "No Consent"}
                    </Badge>
                    {app.default_role_name && (
                      <Badge variant="success" mono>
                        default: {app.default_role_name}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {app.description}
                  </p>

                  <div className="grid gap-2.5 pt-1 text-[11px] sm:grid-cols-2">
                    <div className="rounded-[var(--radius-md)] border border-border bg-surface-muted/70 p-3">
                      <p className="font-semibold text-muted-foreground">
                        Allowed Origins ({app.allowed_origins.length})
                      </p>
                      {app.allowed_origins.length > 0 ? (
                        <ul className="mt-1 space-y-0.5 font-mono text-foreground">
                          {app.allowed_origins.map((origin) => (
                            <li key={origin} className="truncate">
                              {origin}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-muted-foreground">
                          None configured
                        </p>
                      )}
                    </div>

                    <div className="rounded-[var(--radius-md)] border border-border bg-surface-muted/70 p-3">
                      <p className="font-semibold text-muted-foreground">
                        Allowed Redirect URIs ({app.allowed_redirect_uris.length}
                        )
                      </p>
                      {app.allowed_redirect_uris.length > 0 ? (
                        <ul className="mt-1 space-y-0.5 font-mono text-foreground">
                          {app.allowed_redirect_uris.map((uri) => (
                            <li key={uri} className="truncate">
                              {uri}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-muted-foreground">
                          None configured
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    <span>{app.roles.length} role(s)</span>
                    <span>{app.permissions.length} permission(s)</span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openEdit(app)}
                >
                  Edit SSO Settings
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
