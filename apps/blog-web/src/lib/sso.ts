import { createNiwaSsoClient } from "@niwa/auth/client";

export const BLOG_APP_ID = "blog";

export const blogSsoClient = createNiwaSsoClient({
  appId: BLOG_APP_ID,
  authApiUrl: process.env.NEXT_PUBLIC_AUTH_API_URL,
  authWebUrl: process.env.NEXT_PUBLIC_AUTH_WEB_URL,
});
