import type { AtprotoBlobRef, AtprotoStrongRef } from "@niwa/blog-validators";
import type { AtprotoRecordEnvelope, AtprotoSession } from "../types/atproto";
import type { MediaStorageRepo } from "./media-storage";

export class AtprotoXrpcError extends Error {
  readonly status: number;
  readonly xrpcError?: string;

  constructor(message: string, status: number, xrpcError?: string) {
    super(message);
    this.name = "AtprotoXrpcError";
    this.status = status;
    this.xrpcError = xrpcError;
  }
}

export interface AtprotoPdsConfig {
  defaultPdsUrl: string;
  ownerDid?: string;
  identifier?: string;
  appPassword?: string;
}

interface ResolvedIdentity {
  did: string;
  pdsUrl: string;
}

const IDENTITY_CACHE_KEY = "_cache/atproto-identity.json";
const IDENTITY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

async function parseErrorBody(res: Response): Promise<{
  error?: string;
  message: string;
}> {
  try {
    const json = (await res.json()) as { error?: string; message?: string };
    return {
      error: json.error,
      message: json.message || json.error || `HTTP ${res.status}`,
    };
  } catch {
    return { message: `HTTP ${res.status} ${res.statusText}` };
  }
}

async function resolvePdsEndpointFromDidDoc(
  did: string,
  fallbackPdsUrl: string
): Promise<string> {
  try {
    let docUrl: string | null = null;
    if (did.startsWith("did:plc:")) {
      docUrl = `https://plc.directory/${encodeURIComponent(did)}`;
    } else if (did.startsWith("did:web:")) {
      const host = did.slice("did:web:".length);
      docUrl = `https://${host}/.well-known/did.json`;
    }
    if (!docUrl) return fallbackPdsUrl;

    const res = await fetch(docUrl, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return fallbackPdsUrl;

    const doc = (await res.json()) as {
      service?: Array<{ id?: string; type?: string; serviceEndpoint?: string }>;
    };
    const pdsService = doc.service?.find(
      (s) =>
        s.id === "#atproto_pds" || s.type === "AtprotoPersonalDataServer"
    );
    if (pdsService?.serviceEndpoint) {
      return trimTrailingSlash(pdsService.serviceEndpoint);
    }
  } catch {
    // Fall back gracefully to configured defaultPdsUrl
  }
  return fallbackPdsUrl;
}

export function createAtprotoPdsRepo(
  config: AtprotoPdsConfig,
  storageRepo?: MediaStorageRepo
) {
  const defaultPdsUrl = trimTrailingSlash(
    config.defaultPdsUrl || "https://bsky.social"
  );
  let cachedSession: AtprotoSession | null = null;

  async function resolveIdentity(): Promise<ResolvedIdentity | null> {
    const configuredDid = config.ownerDid?.trim();
    const identifier = config.identifier?.trim();

    if (storageRepo) {
      const cached = await storageRepo.readJsonCache<ResolvedIdentity>(
        IDENTITY_CACHE_KEY,
        IDENTITY_CACHE_TTL_MS
      );
      if (cached && (!configuredDid || cached.did === configuredDid)) {
        return cached;
      }
    }

    let did = configuredDid || "";
    if (!did && identifier) {
      if (identifier.startsWith("did:")) {
        did = identifier;
      } else {
        const res = await fetch(
          `${defaultPdsUrl}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(identifier)}`
        );
        if (res.ok) {
          const payload = (await res.json()) as { did?: string };
          if (payload.did) {
            did = payload.did;
          }
        }
      }
    }

    if (!did) return null;

    const pdsUrl = await resolvePdsEndpointFromDidDoc(did, defaultPdsUrl);
    const resolved: ResolvedIdentity = { did, pdsUrl };
    if (storageRepo) {
      await storageRepo.writeJsonCache(IDENTITY_CACHE_KEY, resolved);
    }
    return resolved;
  }

  async function getWriteSession(): Promise<AtprotoSession> {
    if (cachedSession) return cachedSession;

    const identifier = config.identifier?.trim();
    const password = config.appPassword?.trim();
    if (!identifier || !password) {
      throw new AtprotoXrpcError(
        "BSKY_IDENTIFIER or BSKY_APP_PASSWORD secret is not configured",
        503,
        "MissingCredentials"
      );
    }

    const identity = await resolveIdentity();
    const loginPdsUrl = identity?.pdsUrl || defaultPdsUrl;

    const res = await fetch(
      `${loginPdsUrl}/xrpc/com.atproto.server.createSession`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      }
    );

    if (!res.ok) {
      const err = await parseErrorBody(res);
      throw new AtprotoXrpcError(err.message, res.status, err.error);
    }

    const body = (await res.json()) as {
      did: string;
      handle: string;
      accessJwt: string;
      refreshJwt: string;
      didDoc?: {
        service?: Array<{
          id?: string;
          type?: string;
          serviceEndpoint?: string;
        }>;
      };
    };

    const pdsFromDoc = body.didDoc?.service?.find(
      (s) =>
        s.id === "#atproto_pds" || s.type === "AtprotoPersonalDataServer"
    )?.serviceEndpoint;

    const pdsUrl = trimTrailingSlash(pdsFromDoc || loginPdsUrl);

    if (storageRepo) {
      await storageRepo.writeJsonCache<ResolvedIdentity>(IDENTITY_CACHE_KEY, {
        did: body.did,
        pdsUrl,
      });
    }

    cachedSession = {
      did: body.did,
      handle: body.handle,
      accessJwt: body.accessJwt,
      refreshJwt: body.refreshJwt,
      pdsUrl,
    };
    return cachedSession;
  }

  return {
    resolveIdentity,

    async listRecords<T>(
      collection: string,
      options?: { limit?: number; cursor?: string }
    ): Promise<{
      did: string;
      records: Array<AtprotoRecordEnvelope<T>>;
      cursor?: string;
    }> {
      const identity = await resolveIdentity();
      if (!identity) {
        throw new AtprotoXrpcError(
          "ATPROTO_OWNER_DID or BSKY_IDENTIFIER is not configured",
          503,
          "NotConfigured"
        );
      }

      const params = new URLSearchParams({
        repo: identity.did,
        collection,
        limit: String(options?.limit ?? 100),
      });
      if (options?.cursor) {
        params.set("cursor", options.cursor);
      }

      const res = await fetch(
        `${identity.pdsUrl}/xrpc/com.atproto.repo.listRecords?${params.toString()}`,
        {
          headers: { Accept: "application/json" },
        }
      );

      if (!res.ok) {
        const err = await parseErrorBody(res);
        throw new AtprotoXrpcError(err.message, res.status, err.error);
      }

      const payload = (await res.json()) as {
        records: Array<AtprotoRecordEnvelope<T>>;
        cursor?: string;
      };

      return {
        did: identity.did,
        records: payload.records ?? [],
        cursor: payload.cursor,
      };
    },

    async getRecord<T>(
      collection: string,
      rkey: string
    ): Promise<AtprotoRecordEnvelope<T> | null> {
      const identity = await resolveIdentity();
      if (!identity) {
        throw new AtprotoXrpcError(
          "ATPROTO_OWNER_DID or BSKY_IDENTIFIER is not configured",
          503,
          "NotConfigured"
        );
      }

      const params = new URLSearchParams({
        repo: identity.did,
        collection,
        rkey,
      });

      const res = await fetch(
        `${identity.pdsUrl}/xrpc/com.atproto.repo.getRecord?${params.toString()}`,
        {
          headers: { Accept: "application/json" },
        }
      );

      if (res.status === 400 || res.status === 404) {
        const err = await parseErrorBody(res);
        if (
          res.status === 404 ||
          err.error === "RecordNotFound" ||
          err.message.toLowerCase().includes("could not locate record")
        ) {
          return null;
        }
        throw new AtprotoXrpcError(err.message, res.status, err.error);
      }

      if (!res.ok) {
        const err = await parseErrorBody(res);
        throw new AtprotoXrpcError(err.message, res.status, err.error);
      }

      return (await res.json()) as AtprotoRecordEnvelope<T>;
    },

    async getBlob(cid: string): Promise<{
      body: ReadableStream<Uint8Array> | null;
      contentType: string;
    } | null> {
      const identity = await resolveIdentity();
      if (!identity) return null;

      const params = new URLSearchParams({
        did: identity.did,
        cid,
      });

      const res = await fetch(
        `${identity.pdsUrl}/xrpc/com.atproto.sync.getBlob?${params.toString()}`
      );

      if (res.status === 404 || res.status === 400) {
        return null;
      }

      if (!res.ok) {
        const err = await parseErrorBody(res);
        throw new AtprotoXrpcError(err.message, res.status, err.error);
      }

      return {
        body: res.body,
        contentType: res.headers.get("Content-Type") || "application/octet-stream",
      };
    },

    async createRecord<T extends object>(
      collection: string,
      record: T,
      rkey?: string
    ): Promise<AtprotoStrongRef> {
      const session = await getWriteSession();

      const res = await fetch(
        `${session.pdsUrl}/xrpc/com.atproto.repo.createRecord`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessJwt}`,
          },
          body: JSON.stringify({
            repo: session.did,
            collection,
            ...(rkey ? { rkey } : {}),
            record,
          }),
        }
      );

      if (!res.ok) {
        const err = await parseErrorBody(res);
        throw new AtprotoXrpcError(err.message, res.status, err.error);
      }

      const payload = (await res.json()) as { uri: string; cid: string };
      return { uri: payload.uri, cid: payload.cid };
    },

    async putRecord<T extends object>(
      collection: string,
      rkey: string,
      record: T
    ): Promise<AtprotoStrongRef> {
      const session = await getWriteSession();

      const res = await fetch(
        `${session.pdsUrl}/xrpc/com.atproto.repo.putRecord`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessJwt}`,
          },
          body: JSON.stringify({
            repo: session.did,
            collection,
            rkey,
            record,
          }),
        }
      );

      if (!res.ok) {
        const err = await parseErrorBody(res);
        throw new AtprotoXrpcError(err.message, res.status, err.error);
      }

      const payload = (await res.json()) as { uri: string; cid: string };
      return { uri: payload.uri, cid: payload.cid };
    },

    async deleteRecord(collection: string, rkey: string): Promise<void> {
      const session = await getWriteSession();

      const res = await fetch(
        `${session.pdsUrl}/xrpc/com.atproto.repo.deleteRecord`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessJwt}`,
          },
          body: JSON.stringify({
            repo: session.did,
            collection,
            rkey,
          }),
        }
      );

      if (!res.ok && res.status !== 404) {
        const err = await parseErrorBody(res);
        throw new AtprotoXrpcError(err.message, res.status, err.error);
      }
    },

    async uploadBlob(
      bytes: ArrayBuffer,
      mimeType: string
    ): Promise<AtprotoBlobRef> {
      const session = await getWriteSession();

      const res = await fetch(
        `${session.pdsUrl}/xrpc/com.atproto.repo.uploadBlob`,
        {
          method: "POST",
          headers: {
            "Content-Type": mimeType,
            Authorization: `Bearer ${session.accessJwt}`,
          },
          body: bytes,
        }
      );

      if (!res.ok) {
        const err = await parseErrorBody(res);
        throw new AtprotoXrpcError(err.message, res.status, err.error);
      }

      const payload = (await res.json()) as { blob: AtprotoBlobRef };
      return payload.blob;
    },
  };
}

export type AtprotoPdsRepo = ReturnType<typeof createAtprotoPdsRepo>;
