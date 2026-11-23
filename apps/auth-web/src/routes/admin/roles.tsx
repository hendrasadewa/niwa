import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  createPermissionSchema,
  createRoleSchema,
} from "@niwa/auth-validators";
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
  extractApiFieldErrors,
  getErrorMessage,
  type AppWithRbac,
  type PermissionRecord,
  type RoleWithPermissions,
} from "../../lib/auth-api";
import { extractZodFieldErrors } from "../../lib/format";

const PROTECTED_ROLE_NAMES = new Set(["admin", "member"]);

export default function AdminRolesRoute() {
  const { getAdminToken } = useAuth();

  const [apps, setApps] = useState<AppWithRbac[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Create Role form
  const [roleAppId, setRoleAppId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [roleErrors, setRoleErrors] = useState<Record<string, string>>({});
  const [creatingRole, setCreatingRole] = useState(false);

  // Create Permission form
  const [permAppId, setPermAppId] = useState("");
  const [permSlug, setPermSlug] = useState("");
  const [permDesc, setPermDesc] = useState("");
  const [permErrors, setPermErrors] = useState<Record<string, string>>({});
  const [creatingPerm, setCreatingPerm] = useState(false);

  // Edit role permissions state
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [draftPermSlugs, setDraftPermSlugs] = useState<Set<string>>(new Set());
  const [savingRolePerms, setSavingRolePerms] = useState(false);

  // Delete confirmations
  const [confirmDeleteRoleId, setConfirmDeleteRoleId] = useState<string | null>(
    null
  );
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [deletingPermId, setDeletingPermId] = useState<string | null>(null);

  const loadData = useCallback(
    async (filterAppId?: string) => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const token = await getAdminToken();
        const [appsRes, rolesRes, permsRes] = await Promise.all([
          authApi.listApps(token),
          authApi.listRoles(token, filterAppId || undefined),
          authApi.listPermissions(token, filterAppId || undefined),
        ]);
        setApps(appsRes.apps);
        setRoles(rolesRes.roles);
        setPermissions(permsRes.permissions);

        const defaultApp = filterAppId || appsRes.apps[0]?.id || "";
        setRoleAppId((prev) => prev || defaultApp);
        setPermAppId((prev) => prev || defaultApp);
      } catch (err) {
        setErrorMessage(
          getErrorMessage(err, "Failed to load roles and permissions.")
        );
      } finally {
        setLoading(false);
      }
    },
    [getAdminToken]
  );

  useEffect(() => {
    loadData(selectedAppId);
  }, [loadData, selectedAppId]);

  const permissionsByApp = useMemo(() => {
    const map = new Map<string, PermissionRecord[]>();
    for (const perm of permissions) {
      const list = map.get(perm.app_id) ?? [];
      list.push(perm);
      map.set(perm.app_id, list);
    }
    return map;
  }, [permissions]);

  const handleFilterChange = (nextAppId: string) => {
    setSelectedAppId(nextAppId);
    setEditingRoleId(null);
    if (nextAppId) {
      setRoleAppId(nextAppId);
      setPermAppId(nextAppId);
    }
  };

  const handleCreateRole = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setFeedbackMessage(null);
    setRoleErrors({});

    const parsed = createRoleSchema.safeParse({
      app_id: roleAppId,
      name: roleName,
      description: roleDesc,
    });
    if (!parsed.success) {
      setRoleErrors(extractZodFieldErrors(parsed.error));
      return;
    }

    setCreatingRole(true);
    try {
      const token = await getAdminToken();
      const { role } = await authApi.createRole(token, parsed.data);
      setRoles((prev) => [...prev, role]);
      setRoleName("");
      setRoleDesc("");
      setFeedbackMessage(`Created role "${role.name}" in ${role.app_id}.`);
    } catch (err) {
      setRoleErrors(extractApiFieldErrors(err));
      setErrorMessage(getErrorMessage(err, "Failed to create role."));
    } finally {
      setCreatingRole(false);
    }
  };

  const handleCreatePermission = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setFeedbackMessage(null);
    setPermErrors({});

    const parsed = createPermissionSchema.safeParse({
      app_id: permAppId,
      slug: permSlug,
      description: permDesc,
    });
    if (!parsed.success) {
      setPermErrors(extractZodFieldErrors(parsed.error));
      return;
    }

    setCreatingPerm(true);
    try {
      const token = await getAdminToken();
      const { permission } = await authApi.createPermission(token, parsed.data);
      setPermissions((prev) => [...prev, permission]);
      setPermSlug("");
      setPermDesc("");
      setFeedbackMessage(
        `Created permission "${permission.slug}" in ${permission.app_id}.`
      );
    } catch (err) {
      setPermErrors(extractApiFieldErrors(err));
      setErrorMessage(getErrorMessage(err, "Failed to create permission."));
    } finally {
      setCreatingPerm(false);
    }
  };

  const openRolePermEditor = (role: RoleWithPermissions) => {
    setEditingRoleId(role.id);
    setDraftPermSlugs(new Set(role.permissions));
    setErrorMessage(null);
    setFeedbackMessage(null);
  };

  const toggleDraftPerm = (slug: string) => {
    setDraftPermSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const handleSaveRolePermissions = async (role: RoleWithPermissions) => {
    setSavingRolePerms(true);
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      const token = await getAdminToken();
      const { role: updated } = await authApi.updateRolePermissions(
        token,
        role.id,
        { permission_slugs: Array.from(draftPermSlugs) }
      );
      setRoles((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setEditingRoleId(null);
      setFeedbackMessage(
        `Updated permissions for "${updated.name}" (${updated.app_id}).`
      );
    } catch (err) {
      setErrorMessage(
        getErrorMessage(err, "Failed to update role permissions.")
      );
    } finally {
      setSavingRolePerms(false);
    }
  };

  const handleDeleteRole = async (role: RoleWithPermissions) => {
    setDeletingRoleId(role.id);
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      const token = await getAdminToken();
      await authApi.deleteRole(token, role.id);
      setRoles((prev) => prev.filter((item) => item.id !== role.id));
      setConfirmDeleteRoleId(null);
      if (editingRoleId === role.id) setEditingRoleId(null);
      setFeedbackMessage(`Deleted role "${role.name}".`);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to delete role."));
    } finally {
      setDeletingRoleId(null);
    }
  };

  const handleDeletePermission = async (perm: PermissionRecord) => {
    setDeletingPermId(perm.id);
    setErrorMessage(null);
    setFeedbackMessage(null);
    try {
      const token = await getAdminToken();
      await authApi.deletePermission(token, perm.id);
      setPermissions((prev) => prev.filter((item) => item.id !== perm.id));
      setRoles((prev) =>
        prev.map((r) =>
          r.app_id === perm.app_id
            ? {
                ...r,
                permissions: r.permissions.filter((s) => s !== perm.slug),
              }
            : r
        )
      );
      setFeedbackMessage(`Deleted permission "${perm.slug}".`);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, "Failed to delete permission."));
    } finally {
      setDeletingPermId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        kicker="Admin ACL"
        title="Roles & Permissions"
        description="Define per-app roles, create granular permissions, and map permissions to roles."
        actions={
          <div className="w-60">
            <FormField label="Filter by app" htmlFor="roles-app-filter">
              <SelectInput
                id="roles-app-filter"
                value={selectedAppId}
                onChange={(e) => handleFilterChange(e.target.value)}
              >
                <option value="">All applications</option>
                {apps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name} ({app.id})
                  </option>
                ))}
              </SelectInput>
            </FormField>
          </div>
        }
      />

      {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
      {feedbackMessage && <Alert variant="success">{feedbackMessage}</Alert>}

      {/* Create Forms Side-by-Side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Create Role"
          description="Add a custom role to an application."
        >
          <form
            aria-label="Create role"
            onSubmit={handleCreateRole}
            className="space-y-3.5"
            noValidate
          >
            <FormField
              label="Application"
              htmlFor="new-role-app"
              error={roleErrors.app_id}
              required
            >
              <SelectInput
                id="new-role-app"
                name="app_id"
                value={roleAppId}
                onChange={(e) => setRoleAppId(e.target.value)}
                invalid={Boolean(roleErrors.app_id)}
                disabled={creatingRole}
                required
              >
                <option value="">Select app...</option>
                {apps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name} ({app.id})
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField
              label="Role Name"
              htmlFor="new-role-name"
              hint="Lowercase slug (e.g. moderator)"
              error={roleErrors.name}
              required
            >
              <TextInput
                id="new-role-name"
                name="name"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                invalid={Boolean(roleErrors.name)}
                disabled={creatingRole}
                placeholder="editor"
                required
              />
            </FormField>

            <FormField
              label="Description"
              htmlFor="new-role-desc"
              error={roleErrors.description}
              required
            >
              <TextInput
                id="new-role-desc"
                name="description"
                value={roleDesc}
                onChange={(e) => setRoleDesc(e.target.value)}
                invalid={Boolean(roleErrors.description)}
                disabled={creatingRole}
                placeholder="Can manage content"
                required
              />
            </FormField>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={creatingRole}
              >
                {creatingRole ? "Creating..." : "Create Role"}
              </Button>
            </div>
          </form>
        </Card>

        <Card
          title="Create Permission"
          description="Add a fine-grained permission slug to an application."
        >
          <form
            aria-label="Create permission"
            onSubmit={handleCreatePermission}
            className="space-y-3.5"
            noValidate
          >
            <FormField
              label="Application"
              htmlFor="new-perm-app"
              error={permErrors.app_id}
              required
            >
              <SelectInput
                id="new-perm-app"
                name="app_id"
                value={permAppId}
                onChange={(e) => setPermAppId(e.target.value)}
                invalid={Boolean(permErrors.app_id)}
                disabled={creatingPerm}
                required
              >
                <option value="">Select app...</option>
                {apps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name} ({app.id})
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField
              label="Permission Slug"
              htmlFor="new-perm-slug"
              hint="e.g. books:write"
              error={permErrors.slug}
              required
            >
              <TextInput
                id="new-perm-slug"
                name="slug"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={permSlug}
                onChange={(e) => setPermSlug(e.target.value)}
                invalid={Boolean(permErrors.slug)}
                disabled={creatingPerm}
                placeholder="inventory:manage"
                required
              />
            </FormField>

            <FormField
              label="Description"
              htmlFor="new-perm-desc"
              error={permErrors.description}
              required
            >
              <TextInput
                id="new-perm-desc"
                name="description"
                value={permDesc}
                onChange={(e) => setPermDesc(e.target.value)}
                invalid={Boolean(permErrors.description)}
                disabled={creatingPerm}
                placeholder="Allows creating and updating items"
                required
              />
            </FormField>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={creatingPerm}
              >
                {creatingPerm ? "Creating..." : "Create Permission"}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Roles & Permission Mappings */}
      <Card
        title={`Roles (${roles.length})`}
        description="Built-in roles (admin, member) cannot be deleted, but their permissions can be customized."
        actions={
          <Button
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => loadData(selectedAppId)}
          >
            Refresh
          </Button>
        }
      >
        {loading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Loading roles...
          </p>
        ) : roles.length === 0 ? (
          <EmptyState
            title="No roles found"
            description="Create a role above or clear the app filter."
          />
        ) : (
          <div className="divide-y divide-border">
            {roles.map((role) => {
              const isBuiltin = PROTECTED_ROLE_NAMES.has(role.name);
              const isEditing = editingRoleId === role.id;
              const isConfirmingDelete = confirmDeleteRoleId === role.id;
              const appPerms = permissionsByApp.get(role.app_id) ?? [];

              return (
                <div key={role.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-serif text-base font-medium text-foreground">
                          {role.name}
                        </span>
                        <Badge variant="primary" mono>
                          {role.app_id}
                        </Badge>
                        {isBuiltin && (
                          <Badge variant="neutral">Built-in</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {role.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {role.permissions.length > 0 ? (
                          role.permissions.map((slug) => (
                            <Badge key={slug} variant="success" mono>
                              {slug}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            No permissions mapped
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
                            ? setEditingRoleId(null)
                            : openRolePermEditor(role)
                        }
                      >
                        {isEditing ? "Close Editor" : "Edit Permissions"}
                      </Button>

                      {!isBuiltin &&
                        (isConfirmingDelete ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deletingRoleId === role.id}
                              onClick={() => setConfirmDeleteRoleId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={deletingRoleId === role.id}
                              onClick={() => handleDeleteRole(role)}
                            >
                              {deletingRoleId === role.id
                                ? "Deleting..."
                                : "Confirm Delete"}
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setConfirmDeleteRoleId(role.id)}
                          >
                            Delete
                          </Button>
                        ))}
                    </div>
                  </div>

                  {/* Inline Permission Mapper */}
                  {isEditing && (
                    <div className="mt-4 space-y-3 rounded-[var(--radius-xl)] border border-border bg-surface-muted/70 p-4">
                      <p className="text-xs font-medium text-foreground">
                        Permissions for{" "}
                        <span className="font-mono text-primary">
                          {role.app_id}:{role.name}
                        </span>
                      </p>

                      {appPerms.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No permissions defined for{" "}
                          <span className="font-mono">{role.app_id}</span> yet.
                          Create one above first.
                        </p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {appPerms.map((perm) => (
                            <Checkbox
                              key={perm.id}
                              card
                              monoLabel
                              checked={draftPermSlugs.has(perm.slug)}
                              onChange={() => toggleDraftPerm(perm.slug)}
                              disabled={savingRolePerms}
                              label={perm.slug}
                              description={perm.description}
                            />
                          ))}
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={savingRolePerms}
                          onClick={() => setEditingRoleId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={savingRolePerms}
                          onClick={() => handleSaveRolePermissions(role)}
                        >
                          {savingRolePerms ? "Saving..." : "Save Permissions"}
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

      {/* Permissions Catalog */}
      <Card title={`Permissions Catalog (${permissions.length})`}>
        {loading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Loading permissions...
          </p>
        ) : permissions.length === 0 ? (
          <EmptyState
            title="No permissions found"
            description="Create a permission above to assign it to roles."
          />
        ) : (
          <div className="divide-y divide-border">
            {permissions.map((perm) => (
              <div
                key={perm.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {perm.slug}
                    </span>
                    <Badge variant="neutral" mono>
                      {perm.app_id}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {perm.description}
                  </p>
                </div>

                <Button
                  variant="danger"
                  size="xs"
                  disabled={deletingPermId === perm.id}
                  onClick={() => handleDeletePermission(perm)}
                >
                  {deletingPermId === perm.id ? "Removing..." : "Remove"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
