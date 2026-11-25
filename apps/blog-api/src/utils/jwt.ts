import {
  DEFAULT_JWT_ISSUER,
  verifyNiwaToken as verifySharedNiwaToken,
  type JwksFetcher,
} from "@niwa/auth/server";
import type { NiwaJwtPayload } from "../types/auth";
import { BLOG_APP_ID } from "./auth";

export { DEFAULT_JWT_ISSUER, type JwksFetcher };

export type VerifyNiwaTokenOptions = {
  authApi?: JwksFetcher;
  authApiUrl?: string;
  issuer?: string;
  audience?: string;
};

export async function verifyNiwaToken(
  token: string,
  options: VerifyNiwaTokenOptions
): Promise<NiwaJwtPayload> {
  const payload = await verifySharedNiwaToken(token, {
    authApi: options.authApi,
    authApiUrl: options.authApiUrl,
    issuer: options.issuer,
    audience: options.audience || BLOG_APP_ID,
  });
  return payload as unknown as NiwaJwtPayload;
}
