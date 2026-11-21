import {
  createLocalJWKSet,
  errors as joseErrors,
  jwtVerify,
  type JSONWebKeySet,
} from "jose";
import type { NiwaJwtPayload } from "../types";

export const DEFAULT_JWT_ISSUER = "https://auth.api.hendrasadewa.com";
const DEFAULT_AUTH_API_URL = "http://localhost:8788";
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export type JwksFetcher = {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

export interface VerifyNiwaTokenOptions {
  authApi?: JwksFetcher;
  authApiUrl?: string;
  issuer?: string;
  audience: string;
}

type CachedJwks = {
  jwks: JSONWebKeySet;
  fetchedAt: number;
};

const jwksCache = new Map<string, CachedJwks>();

async function fetchJwks(
  options: Pick<VerifyNiwaTokenOptions, "authApi" | "authApiUrl">,
  forceRefresh = false
): Promise<JSONWebKeySet> {
  const baseUrl = (options.authApiUrl || DEFAULT_AUTH_API_URL).replace(
    /\/+$/,
    ""
  );
  const cacheKey = options.authApi ? "service-binding" : baseUrl;
  const cached = jwksCache.get(cacheKey);
  const now = Date.now();

  if (!forceRefresh && cached && now - cached.fetchedAt < JWKS_CACHE_TTL_MS) {
    return cached.jwks;
  }

  const response = options.authApi
    ? await options.authApi.fetch(
        new Request("https://auth-api.internal/.well-known/jwks.json", {
          method: "GET",
          headers: { Accept: "application/json" },
        })
      )
    : await fetch(`${baseUrl}/.well-known/jwks.json`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS (${response.status})`);
  }

  const jwks = (await response.json()) as JSONWebKeySet;
  if (!jwks || !Array.isArray(jwks.keys)) {
    throw new Error("Invalid JWKS response");
  }

  jwksCache.set(cacheKey, { jwks, fetchedAt: now });
  return jwks;
}

export async function verifyNiwaToken(
  token: string,
  options: VerifyNiwaTokenOptions
): Promise<NiwaJwtPayload> {
  const issuer = options.issuer || DEFAULT_JWT_ISSUER;

  const verifyWithJwks = async (jwks: JSONWebKeySet) => {
    const jwkSet = createLocalJWKSet(jwks);
    const { payload } = await jwtVerify(token, jwkSet, {
      algorithms: ["ES256"],
      issuer,
      audience: options.audience,
    });
    return payload as unknown as NiwaJwtPayload;
  };

  const jwks = await fetchJwks(options, false);
  try {
    return await verifyWithJwks(jwks);
  } catch (err) {
    if (err instanceof joseErrors.JWKSNoMatchingKey) {
      const refreshedJwks = await fetchJwks(options, true);
      return await verifyWithJwks(refreshedJwks);
    }
    throw err;
  }
}
