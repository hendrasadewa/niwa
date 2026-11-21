import { createNiwaSsoClient } from "@niwa/auth/client";

export const PUSTAKA_APP_ID = "pustaka";

export const pustakaSsoClient = createNiwaSsoClient({
  appId: PUSTAKA_APP_ID,
  authApiUrl: process.env.NEXT_PUBLIC_AUTH_API_URL,
  authWebUrl: process.env.NEXT_PUBLIC_AUTH_WEB_URL,
});
