import {
  createLocalJWKSet,
  importJWK,
  jwtVerify,
  SignJWT,
  type JSONWebKeySet,
  type JWK,
} from "jose";
import { SsoErrors } from "../errors/sso";
import type { AuthUserResponse, NiwaJwtPayload } from "../types/auth";

export const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 60 * 5; // 5 minutes
export const DEFAULT_JWT_ISSUER = "https://auth.api.hendrasadewa.com";
export const DEFAULT_AUTH_WEB_URL = "https://auth.hendrasadewa.com";

export type JwtSigningConfig = {
  activeKid?: string;
  privateKeyJwk: string;
  extraPublicJwks?: string;
  issuer?: string;
};

export type SignNiwaTokenOptions = {
  ttlSeconds?: number;
  appId?: string;
  sessionId?: string;
  amr?: string[];
  emailVerified?: boolean;
};

type CachedPrivateKey = {
  key: Awaited<ReturnType<typeof importJWK>>;
  kid: string;
  publicJwk: JWK;
};

const privateKeyCache = new Map<string, CachedPrivateKey>();

export function resolveAccessTokenTtl(envValue?: string): number {
  if (!envValue) return DEFAULT_ACCESS_TOKEN_TTL_SECONDS;
  const parsed = Number.parseInt(envValue, 10);
  if (!Number.isFinite(parsed) || parsed < 60) {
    return DEFAULT_ACCESS_TOKEN_TTL_SECONDS;
  }
  return parsed;
}

export function resolveJwtIssuer(envValue?: string): string {
  const trimmed = envValue?.trim();
  if (!trimmed) return DEFAULT_JWT_ISSUER;
  return trimmed.replace(/\/+$/, "");
}

export function resolveAuthWebUrl(envValue?: string): string {
  const trimmed = envValue?.trim();
  if (!trimmed) return DEFAULT_AUTH_WEB_URL;
  return trimmed.replace(/\/+$/, "");
}

function toPublicEcJwk(jwk: JWK, kid: string): JWK {
  return {
    kty: jwk.kty,
    crv: jwk.crv,
    x: jwk.x,
    y: jwk.y,
    kid,
    alg: "ES256",
    use: "sig",
  };
}

async function loadSigningKey(
  config: JwtSigningConfig
): Promise<CachedPrivateKey> {
  const cacheKey = `${config.activeKid ?? ""}:${config.privateKeyJwk}`;
  const cached = privateKeyCache.get(cacheKey);
  if (cached) return cached;

  let parsed: JWK;
  try {
    parsed = JSON.parse(config.privateKeyJwk) as JWK;
  } catch {
    throw SsoErrors.signingKeyInvalid();
  }

  if (
    parsed.kty !== "EC" ||
    parsed.crv !== "P-256" ||
    typeof parsed.x !== "string" ||
    typeof parsed.y !== "string" ||
    typeof parsed.d !== "string"
  ) {
    throw SsoErrors.signingKeyInvalid();
  }

  const kid = config.activeKid?.trim() || parsed.kid || "niwa-es256-default";
  const key = await importJWK({ ...parsed, alg: "ES256" }, "ES256");
  const publicJwk = toPublicEcJwk(parsed, kid);

  const entry: CachedPrivateKey = { key, kid, publicJwk };
  privateKeyCache.set(cacheKey, entry);
  return entry;
}

export async function buildPublicJwks(
  config: JwtSigningConfig
): Promise<JSONWebKeySet> {
  const { publicJwk } = await loadSigningKey(config);
  const keys: JWK[] = [publicJwk];

  if (config.extraPublicJwks?.trim()) {
    try {
      const parsed = JSON.parse(config.extraPublicJwks) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (
            item &&
            typeof item === "object" &&
            (item as JWK).kty === "EC" &&
            (item as JWK).crv === "P-256" &&
            typeof (item as JWK).x === "string" &&
            typeof (item as JWK).y === "string" &&
            typeof (item as JWK).kid === "string"
          ) {
            const candidate = item as JWK;
            if (!keys.some((k) => k.kid === candidate.kid)) {
              keys.push(toPublicEcJwk(candidate, candidate.kid!));
            }
          }
        }
      }
    } catch {
      // Ignore malformed optional rotation keys rather than failing JWKS publication
    }
  }

  return { keys };
}

export async function signNiwaToken(
  user: Pick<
    AuthUserResponse,
    | "id"
    | "email"
    | "name"
    | "whatsapp_number"
    | "app_roles"
    | "app_permissions"
    | "created_at"
  >,
  signingConfig: JwtSigningConfig,
  options: SignNiwaTokenOptions = {}
): Promise<string> {
  const { key, kid } = await loadSigningKey(signingConfig);
  const issuer = resolveJwtIssuer(signingConfig.issuer);
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_ACCESS_TOKEN_TTL_SECONDS;
  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID();

  let aud: string | string[];
  let scopedAppRoles = user.app_roles;
  let scopedAppPermissions = user.app_permissions;
  let roles: string[] | undefined;
  let permissions: string[] | undefined;

  if (options.appId) {
    aud = options.appId;
    const appRoles = user.app_roles[options.appId] ?? [];
    const appPerms = user.app_permissions[options.appId] ?? [];
    roles = appRoles;
    permissions = appPerms;
    scopedAppRoles = { [options.appId]: appRoles };
    scopedAppPermissions = { [options.appId]: appPerms };
  } else {
    const appIds = Object.keys(user.app_roles);
    aud = appIds.length > 0 ? appIds : ["niwa"];
  }

  const payload: Omit<NiwaJwtPayload, "iss" | "sub" | "aud" | "iat" | "exp" | "jti"> = {
    ...(options.sessionId ? { sid: options.sessionId } : {}),
    email: user.email,
    email_verified: options.emailVerified ?? false,
    name: user.name,
    whatsapp_number: user.whatsapp_number,
    ...(options.amr ? { amr: options.amr } : {}),
    ...(roles ? { roles } : {}),
    ...(permissions ? { permissions } : {}),
    app_roles: scopedAppRoles,
    app_permissions: scopedAppPermissions,
    created_at: user.created_at,
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "ES256", typ: "JWT", kid })
    .setIssuer(issuer)
    .setSubject(user.id)
    .setAudience(aud)
    .setJti(jti)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(key);
}

export async function verifyNiwaToken(
  token: string,
  signingConfig: JwtSigningConfig,
  expectedAudience?: string
): Promise<NiwaJwtPayload> {
  const jwks = await buildPublicJwks(signingConfig);
  const jwkSet = createLocalJWKSet(jwks);
  const issuer = resolveJwtIssuer(signingConfig.issuer);

  const { payload } = await jwtVerify(token, jwkSet, {
    algorithms: ["ES256"],
    issuer,
    ...(expectedAudience ? { audience: expectedAudience } : {}),
  });

  return payload as unknown as NiwaJwtPayload;
}
