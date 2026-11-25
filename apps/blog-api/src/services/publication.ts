import {
  STANDARD_PUBLICATION_COLLECTION,
  type StandardPublicationDto,
  type UpsertPublicationInput,
} from "@niwa/blog-validators";
import { BlogErrors } from "../errors/blog";
import { AtprotoXrpcError, type AtprotoPdsRepo } from "../repositories/atproto-pds";
import type { MediaStorageRepo } from "../repositories/media-storage";
import type {
  AtprotoRecordEnvelope,
  StandardPublicationRecord,
} from "../types/atproto";
import { generateTid, parseAtUri } from "../utils/tid";
import { buildBlobPublicUrl } from "./media";

export const PUBLICATION_CACHE_KEY = "_cache/publication.json";
const PUBLICATION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface PublicationServiceDeps {
  atprotoPdsRepo: AtprotoPdsRepo;
  mediaStorageRepo: MediaStorageRepo;
  blogPublicUrl: string;
  apiPublicUrl: string;
  configuredPublicationRkey?: string;
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function mapPublicationEnvelope(
  envelope: AtprotoRecordEnvelope<StandardPublicationRecord>,
  apiPublicUrl: string
): StandardPublicationDto {
  const parsed = parseAtUri(envelope.uri);
  const iconCid = envelope.value.icon?.ref?.$link ?? null;
  return {
    uri: envelope.uri,
    cid: envelope.cid,
    rkey: parsed?.rkey ?? "",
    did: parsed?.did ?? "",
    url: normalizeUrl(envelope.value.url),
    name: envelope.value.name,
    description: envelope.value.description ?? "",
    iconCid,
    iconUrl: iconCid ? buildBlobPublicUrl(apiPublicUrl, iconCid) : null,
  };
}

export function createPublicationService({
  atprotoPdsRepo,
  mediaStorageRepo,
  blogPublicUrl,
  apiPublicUrl,
  configuredPublicationRkey,
}: PublicationServiceDeps) {
  const canonicalUrl = normalizeUrl(
    blogPublicUrl || "https://blog.hendrasadewa.com"
  );

  async function fetchPublicationFromPds(): Promise<StandardPublicationDto | null> {
    try {
      const configuredRkey = configuredPublicationRkey?.trim();
      if (configuredRkey) {
        const direct = await atprotoPdsRepo.getRecord<StandardPublicationRecord>(
          STANDARD_PUBLICATION_COLLECTION,
          configuredRkey
        );
        if (direct) {
          return mapPublicationEnvelope(direct, apiPublicUrl);
        }
      }

      const listed = await atprotoPdsRepo.listRecords<StandardPublicationRecord>(
        STANDARD_PUBLICATION_COLLECTION,
        { limit: 50 }
      );

      if (listed.records.length === 0) return null;

      const exactMatch = listed.records.find(
        (rec) => normalizeUrl(rec.value.url) === canonicalUrl
      );
      const selected = exactMatch ?? listed.records[0];
      return selected ? mapPublicationEnvelope(selected, apiPublicUrl) : null;
    } catch (err) {
      if (err instanceof AtprotoXrpcError) {
        if (err.status === 503) {
          return null;
        }
        throw BlogErrors.atprotoUpstreamError("listPublication", err.message);
      }
      throw err;
    }
  }

  return {
    async getPublication(opts?: {
      bypassCache?: boolean;
    }): Promise<StandardPublicationDto | null> {
      if (!opts?.bypassCache) {
        const cached =
          await mediaStorageRepo.readJsonCache<StandardPublicationDto | null>(
            PUBLICATION_CACHE_KEY,
            PUBLICATION_CACHE_TTL_MS
          );
        if (cached !== null) {
          return cached;
        }
      }

      const publication = await fetchPublicationFromPds();
      if (publication) {
        await mediaStorageRepo.writeJsonCache(
          PUBLICATION_CACHE_KEY,
          publication
        );
      } else {
        await mediaStorageRepo.deleteJsonCache(PUBLICATION_CACHE_KEY);
      }
      return publication;
    },

    async upsertPublication(
      input: UpsertPublicationInput
    ): Promise<StandardPublicationDto> {
      const existing = await fetchPublicationFromPds();
      const targetRkey =
        existing?.rkey || configuredPublicationRkey?.trim() || generateTid();

      const record: StandardPublicationRecord = {
        $type: STANDARD_PUBLICATION_COLLECTION,
        url: normalizeUrl(input.url || canonicalUrl),
        name: input.name.trim(),
        ...(input.description?.trim()
          ? { description: input.description.trim() }
          : {}),
      };

      try {
        const ref = existing
          ? await atprotoPdsRepo.putRecord(
              STANDARD_PUBLICATION_COLLECTION,
              targetRkey,
              record
            )
          : await atprotoPdsRepo.createRecord(
              STANDARD_PUBLICATION_COLLECTION,
              record,
              targetRkey
            );

        const parsed = parseAtUri(ref.uri);
        const dto: StandardPublicationDto = {
          uri: ref.uri,
          cid: ref.cid,
          rkey: parsed?.rkey ?? targetRkey,
          did: parsed?.did ?? "",
          url: record.url,
          name: record.name,
          description: record.description ?? "",
          iconCid: null,
          iconUrl: null,
        };

        await mediaStorageRepo.writeJsonCache(PUBLICATION_CACHE_KEY, dto);
        return dto;
      } catch (err) {
        if (err instanceof AtprotoXrpcError) {
          if (err.status === 503) {
            throw BlogErrors.atprotoNotConfigured(err.message);
          }
          if (err.status === 401) {
            throw BlogErrors.atprotoAuthFailed(err.message);
          }
          throw BlogErrors.atprotoUpstreamError("upsertPublication", err.message);
        }
        throw err;
      }
    },

    async invalidateCache(): Promise<void> {
      await mediaStorageRepo.deleteJsonCache(PUBLICATION_CACHE_KEY);
    },
  };
}

export type PublicationService = ReturnType<typeof createPublicationService>;
