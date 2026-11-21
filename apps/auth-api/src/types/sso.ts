import type { AuthUserResponse } from "./auth";

export type IdpSessionInfo = {
  id: string;
  user_id: string;
  amr: string[];
  ip_address: string | null;
  user_agent: string | null;
  last_seen_at: number;
  expires_at: number;
  created_at: number;
};

export type AccountSessionResponse = IdpSessionInfo & {
  is_current: boolean;
};

export type SsoAppMetadata = {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  default_role_name: string | null;
  require_consent: boolean;
};

export type SsoTokenResponse =
  | {
      status: "authenticated";
      token: string;
      expires_in: number;
      user: AuthUserResponse;
    }
  | {
      status: "consent_required";
      app: SsoAppMetadata;
      consent_url: string;
    }
  | {
      status: "unauthenticated";
    };

export type SsoConsentResponse = {
  approved: boolean;
  app_id: string;
  redirect_uri?: string;
};

export type ConnectedAppResponse = {
  app_id: string;
  name: string;
  description: string;
  icon_url: string | null;
  granted_scopes: string[];
  roles: string[];
  consented_at: number;
};
