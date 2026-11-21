export type PermissionRecord = {
  id: string;
  app_id: string;
  slug: string;
  description: string;
};

export type RoleWithPermissions = {
  id: string;
  app_id: string;
  name: string;
  description: string;
  permissions: string[];
};

export type AppWithRbac = {
  id: string;
  name: string;
  description: string;
  allowed_origins: string[];
  allowed_redirect_uris: string[];
  default_role_name: string | null;
  require_consent: boolean;
  icon_url: string | null;
  roles: RoleWithPermissions[];
  permissions: PermissionRecord[];
};
