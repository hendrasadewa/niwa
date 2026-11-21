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
  roles: RoleWithPermissions[];
  permissions: PermissionRecord[];
};
