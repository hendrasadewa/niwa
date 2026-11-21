import { createNiwaSsoClient } from "@niwa/auth/client";

export const OPEN_PO_APP_ID = "open-po";

export const openPoSsoClient = createNiwaSsoClient({
  appId: OPEN_PO_APP_ID,
  authApiUrl: process.env.NEXT_PUBLIC_AUTH_API_URL,
  authWebUrl: process.env.NEXT_PUBLIC_AUTH_WEB_URL,
});
