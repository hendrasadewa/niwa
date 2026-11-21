export type AppRoleMap = Record<string, string[]>;
export type AppPermissionMap = Record<string, string[]>;

export interface SsoUserPayload {
  id: string;
  email: string;
  name: string;
  whatsapp_number: string;
  is_active: boolean;
  email_verified_at?: number | null;
  app_roles: AppRoleMap;
  app_permissions: AppPermissionMap;
  created_at: number;
  updated_at: number;
}

export interface SsoAppMetadata {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  default_role_name: string | null;
  require_consent: boolean;
}

export type SsoTokenExchangeResponse =
  | {
      status: "authenticated";
      token: string;
      expires_in: number;
      user: SsoUserPayload;
    }
  | {
      status: "consent_required";
      app: SsoAppMetadata;
      consent_url: string;
    }
  | {
      status: "unauthenticated";
    };

export interface NiwaJwtPayload {
  iss?: string;
  sub: string;
  aud?: string | string[];
  sid?: string;
  jti?: string;
  email: string;
  email_verified?: boolean;
  name: string;
  whatsapp_number?: string;
  amr?: string[];
  roles?: string[];
  permissions?: string[];
  app_roles?: AppRoleMap;
  app_permissions?: AppPermissionMap;
  created_at?: number;
  iat: number;
  exp: number;
}
