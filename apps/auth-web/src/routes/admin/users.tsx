import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  FormField,
  PageHeader,
  SelectInput,
  TextInput,
} from "@niwa/ui/components";
import { useAuth } from "../../context/auth-context";
import {
  authApi,
  getErrorMessage,
  type AppWithRbac,
  type AuthUser,
} from "../../lib/auth-api";
import { formatUnixDate, maskEmail, maskPhone } from "../../lib/format";

export default function AdminUsersRoute() {
  const { user: currentUser, getAdminToken } = useAuth();

  const [apps, setApps] = useState<AppWithRbac[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [filterAppId, setFilterAppId] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "true" | "false">("");

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Status toggle state
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  // Per-app role editor state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [roleEditorAppId, setRoleEditorAppId] = useState<string>("");
  const [draftRoles, setDraftRoles] = useState<Set<string>>(new Set());
  const [savingRoles, setSavingRoles] = useState(false);

  const loadUsers = useCallback(
    async (opts?: {
      search?: string;
      appId?: string;
      status?: "" | "true" | "false";
    }) => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const token = await getAdminToken();
        const [appsRes, usersRes] = await Promise.all([
          authApi.listApps(token),
          authApi.listUsers(token, {
            search: opts?.search ?? search,
            app_id: (opts?.appId ?? filterAppId) || undefined,
            is_active: (opts?.status ?? filterStatus) || undefined,
          }),
        ]);
        setApps(appsRes.apps);
        setUsers(usersRes.users);
        setTotal(usersRes.total);
      } catch (err) {
        setErrorMessage(getErrorMessage(err, "Failed to load users."));
      } finally {
        setLoading(false);
      }
    },
    [getAdminToken, search, filterAppId, filterStatus]
  );

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    loadUsers({ search, appId: filterAppId, status: filterStatus });
  };

  const handleResetFilters = () => {
    setSearch("");
    setFilterAppId("");
    setFilterStatus("");
    loadUsers({ search: "", appId: "", status: "" });
  };

  const handleToggleStatus = async (target: AuthUser) => {
    setTogglingUserId(target.id);
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      const token = await getAdminToken();
      const res = await authApi.updateUserStatus(token, target.id, {
        is_active: !target.is_active,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === res.user.id ? res.user : u))
      );
      setFeedbackMessage(
        `${maskEmail(res.user.email)} is now ${res.user.is_active ? "active" : "deactivated"}.`
      );
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to update user status."));
    } finally {
      setTogglingUserId(null);
    }
  };

  const openRoleEditor = (target: AuthUser, initialAppId?: string) => {
    const appId = initialAppId || apps[0]?.id || "";
    setEditingUserId(target.id);
    setRoleEditorAppId(appId);
    setDraftRoles(new Set(target.app_roles[appId] ?? []));
    setErrorMessage(null);
    setFeedbackMessage(null);
  };

  const handleRoleEditorAppChange = (target: AuthUser, nextAppId: string) => {
    setRoleEditorAppId(nextAppId);
    setDraftRoles(new Set(target.app_roles[nextAppId] ?? []));
  };

  const toggleDraftRole = (roleName: string) => {
    setDraftRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleName)) next.delete(roleName);
      else next.add(roleName);
      return next;
    });
  };

  const handleSaveUserRoles = async (target: AuthUser) => {
    if (!roleEditorAppId) return;
    setSavingRoles(true);
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      const token = await getAdminToken();
      const { user: updated } = await authApi.setUserAppRoles(
        token,
        target.id,
        {
          app_id: roleEditorAppId,
          roles: Array.from(draftRoles),
        }
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u))
      );
      setEditingUserId(null);
      setFeedbackMessage(
        `Updated ${roleEditorAppId} roles for ${maskEmail(updated.email)}.`
      );
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to update user roles."));
    } finally {
      setSavingRoles(false);
    }
  };

  const selectedAppForEditor = apps.find((a) => a.id === roleEditorAppId);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        kicker="Admin ACL"
        title="Users Directory"
        description="Search accounts, activate or suspend users, and manage per-application role assignments."
      />

      {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
      {feedbackMessage && <Alert variant="success">{feedbackMessage}</Alert>}

      {/* Filter Bar */}
      <Card>
        <search>
          <form
            aria-label="Filter users"
            onSubmit={handleFilterSubmit}
            className="grid gap-3 sm:grid-cols-12 sm:items-end"
          >
            <div className="sm:col-span-5">
              <FormField label="Search" htmlFor="users-search">
                <TextInput
                  id="users-search"
                  name="search"
                  type="search"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Name, email, or WhatsApp..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FormField>
            </div>

            <div className="sm:col-span-3">
              <FormField label="App" htmlFor="users-filter-app">
                <SelectInput
                  id="users-filter-app"
                  name="app_id"
                  value={filterAppId}
                  onChange={(e) => setFilterAppId(e.target.value)}
                >
                  <option value="">All apps</option>
                  {apps.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.name}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
            </div>

            <div className="sm:col-span-2">
              <FormField label="Status" htmlFor="users-filter-status">
                <SelectInput
                  id="users-filter-status"
                  name="is_active"
                  value={filterStatus}
                  onChange={(e) =>
                    setFilterStatus(e.target.value as "" | "true" | "false")
                  }
                >
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </SelectInput>
              </FormField>
            </div>

            <div className="flex gap-2 sm:col-span-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="min-h-11 flex-1"
                disabled={loading}
              >
                Filter
              </Button>
              {(search || filterAppId || filterStatus) && (
                <Button
                  variant="ghost"
                  size="md"
                  className="min-h-11"
                  disabled={loading}
                  onClick={handleResetFilters}
                >
                  Clear
                </Button>
              )}
            </div>
          </form>
        </search>
      </Card>

      {/* Users List */}
      <Card
        title={`Users (${total})`}
        actions={
          <Button
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => loadUsers()}
          >
            Refresh
          </Button>
        }
      >
        {loading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Loading users...
          </p>
        ) : users.length === 0 ? (
          <EmptyState
            title="No users match your filters"
            description="Try adjusting your search query or clearing filters."
          />
        ) : (
          <div className="divide-y divide-border">
            {users.map((target) => {
              const isSelf = target.id === currentUser?.id;
              const isEditing = editingUserId === target.id;
              const appRoleEntries = Object.entries(target.app_roles).filter(
                ([, roleList]) => roleList.length > 0
              );

              return (
                <div key={target.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-serif text-base font-medium text-foreground">
                          {target.name}
                        </p>
                        <Badge
                          variant={target.is_active ? "success" : "danger"}
                          dot
                        >
                          {target.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {isSelf && <Badge variant="primary">You</Badge>}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="text-foreground">
                          {maskEmail(target.email)}
                        </span>
                        {target.whatsapp_number && (
                          <span className="font-mono">
                            WA: {maskPhone(target.whatsapp_number)}
                          </span>
                        )}
                        <span>Joined {formatUnixDate(target.created_at)}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {appRoleEntries.length > 0 ? (
                          appRoleEntries.map(([appId, roleList]) =>
                            roleList.map((roleName) => (
                              <Badge
                                key={`${appId}:${roleName}`}
                                variant={
                                  roleName === "admin" ? "warning" : "neutral"
                                }
                                mono
                              >
                                {appId}:{roleName}
                              </Badge>
                            ))
                          )
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            No app roles assigned
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          isEditing
                            ? setEditingUserId(null)
                            : openRoleEditor(target)
                        }
                      >
                        {isEditing ? "Close Roles" : "Manage Roles"}
                      </Button>

                      <Button
                        variant={target.is_active ? "danger" : "primary"}
                        size="sm"
                        disabled={
                          togglingUserId === target.id ||
                          (isSelf && target.is_active)
                        }
                        title={
                          isSelf && target.is_active
                            ? "You cannot deactivate your own account"
                            : undefined
                        }
                        onClick={() => handleToggleStatus(target)}
                      >
                        {togglingUserId === target.id
                          ? "Updating..."
                          : target.is_active
                            ? "Deactivate"
                            : "Activate"}
                      </Button>
                    </div>
                  </div>

                  {/* Inline Per-App Role Editor */}
                  {isEditing && (
                    <div className="mt-4 space-y-3 rounded-[var(--radius-xl)] border border-border bg-surface-muted/70 p-4">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="w-60">
                          <FormField
                            label="Application"
                            htmlFor={`role-app-${target.id}`}
                          >
                            <SelectInput
                              id={`role-app-${target.id}`}
                              value={roleEditorAppId}
                              onChange={(e) =>
                                handleRoleEditorAppChange(
                                  target,
                                  e.target.value
                                )
                              }
                              disabled={savingRoles}
                            >
                              {apps.map((app) => (
                                <option key={app.id} value={app.id}>
                                  {app.name} ({app.id})
                                </option>
                              ))}
                            </SelectInput>
                          </FormField>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Replaces all roles for{" "}
                          <span className="font-medium text-foreground">
                            {maskEmail(target.email)}
                          </span>{" "}
                          in{" "}
                          <span className="font-mono text-primary">
                            {roleEditorAppId}
                          </span>
                          .
                        </p>
                      </div>

                      {selectedAppForEditor &&
                      selectedAppForEditor.roles.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {selectedAppForEditor.roles.map((role) => (
                            <Checkbox
                              key={role.id}
                              card
                              monoLabel
                              checked={draftRoles.has(role.name)}
                              onChange={() => toggleDraftRole(role.name)}
                              disabled={savingRoles}
                              label={role.name}
                              description={role.description}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No roles configured for this app.
                        </p>
                      )}

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={savingRoles}
                          onClick={() => setEditingUserId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={savingRoles}
                          onClick={() => handleSaveUserRoles(target)}
                        >
                          {savingRoles ? "Saving..." : "Save Roles"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
