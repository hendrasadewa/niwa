import {
  BLOG_MARKDOWN_LEXICON,
  BSKY_POST_COLLECTION,
  STANDARD_DOCUMENT_COLLECTION,
  type AtprotoBlobRef,
  type DraftDto,
  type PublishDraftInput,
  type StandardDocumentDto,
  type StandardDocumentSummaryDto,
  type UnpublishPostInput,
  type UpdatePublishedPostInput,
} from "@niwa/blog-validators";
import { BlogErrors } from "../errors/blog";
import { AtprotoXrpcError, type AtprotoPdsRepo } from "../repositories/atproto-pds";
import type { DraftRepo } from "../repositories/drafts";
import type { MediaStorageRepo } from "../repositories/media-storage";
import type {
  AtprotoRecordEnvelope,
  BskyFeedPostRecord,
  StandardDocumentRecord,
} from "../types/atproto";
import { detectBskyFacets } from "../utils/bsky-facets";
import {
  buildDefaultBskyTeaser,
  buildExcerpt,
  estimateReadingTimeMinutes,
  extractSlugFromPath,
  normalizePostPath,
  stripMarkdownToPlainText,
} from "../utils/markdown";
import { generateTid, parseAtUri } from "../utils/tid";
import {
  buildBlobPublicUrl,
  buildMediaPublicUrl,
  MAX_PDS_COVER_IMAGE_BYTES,
} from "./media";
import type { PublicationService } from "./publication";

export const DOCUMENTS_CACHE_KEY = "_cache/documents.json";
const DOCUMENTS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface PostServiceDeps {
  atprotoPdsRepo: AtprotoPdsRepo;
  mediaStorageRepo: MediaStorageRepo;
  draftRepo: DraftRepo;
  publicationService: PublicationService;
  blogPublicUrl: string;
  apiPublicUrl: string;
}

function extractMarkdownFromContent(
  record: StandardDocumentRecord
): string {
  const content = record.content;
  if (content && typeof content === "object") {
    if ("markdown" in content && typeof content.markdown === "string") {
      return content.markdown;
    }
    if ("text" in content && typeof content.text === "string") {
      return content.text;
    }
  }
  return record.textContent ?? "";
}

function mapDocumentEnvelope(
  envelope: AtprotoRecordEnvelope<StandardDocumentRecord>,
  apiPublicUrl: string
): StandardDocumentDto {
  const parsed = parseAtUri(envelope.uri);
  const rkey = parsed?.rkey ?? "";
  const markdown = extractMarkdownFromContent(envelope.value);
  const plainText =
    envelope.value.textContent?.trim() || stripMarkdownToPlainText(markdown);
  const slug = extractSlugFromPath(envelope.value.path, rkey);
  const coverImageCid = envelope.value.coverImage?.ref?.$link ?? null;

  return {
    uri: envelope.uri,
    cid: envelope.cid,
    rkey,
    site: envelope.value.site,
    slug,
    path: envelope.value.path || normalizePostPath(slug),
    title: envelope.value.title,
    description: buildExcerpt(envelope.value.description ?? "", plainText),
    publishedAt: envelope.value.publishedAt,
    updatedAt: envelope.value.updatedAt ?? null,
    tags: Array.isArray(envelope.value.tags) ? envelope.value.tags : [],
    coverImageCid,
    coverImageUrl: coverImageCid
      ? buildBlobPublicUrl(apiPublicUrl, coverImageCid)
      : null,
    bskyPostRef: envelope.value.bskyPostRef ?? null,
    readingTimeMinutes: estimateReadingTimeMinutes(plainText),
    markdown,
    textContent: plainText,
  };
}

function toSummary(doc: StandardDocumentDto): StandardDocumentSummaryDto {
  const { markdown: _m, textContent: _t, ...summary } = doc;
  return summary;
}

function mapXrpcError(action: string, err: unknown): never {
  if (err instanceof AtprotoXrpcError) {
    if (err.status === 503) {
      throw BlogErrors.atprotoNotConfigured(err.message);
    }
    if (err.status === 401) {
      throw BlogErrors.atprotoAuthFailed(err.message);
    }
    throw BlogErrors.atprotoUpstreamError(action, err.message);
  }
  throw err;
}

export function createPostService({
  atprotoPdsRepo,
  mediaStorageRepo,
  draftRepo,
  publicationService,
  blogPublicUrl,
  apiPublicUrl,
}: PostServiceDeps) {
  const canonicalOrigin = (
    blogPublicUrl || "https://blog.hendrasadewa.com"
  ).replace(/\/+$/, "");

  async function fetchAllDocumentsFromPds(): Promise<StandardDocumentDto[]> {
    const publication = await publicationService.getPublication();

    const allRecords: Array<AtprotoRecordEnvelope<StandardDocumentRecord>> = [];
    let cursor: string | undefined;

    try {
      for (let page = 0; page < 20; page += 1) {
        const res = await atprotoPdsRepo.listRecords<StandardDocumentRecord>(
          STANDARD_DOCUMENT_COLLECTION,
          { limit: 100, cursor }
        );
        allRecords.push(...res.records);
        if (!res.cursor || res.records.length === 0) break;
        cursor = res.cursor;
      }
    } catch (err) {
      if (err instanceof AtprotoXrpcError && err.status === 503) {
        return [];
      }
      mapXrpcError("listDocuments", err);
    }

    const filtered = publication
      ? allRecords.filter(
          (rec) =>
            rec.value.site === publication.uri ||
            rec.value.site.replace(/\/+$/, "") === publication.url
        )
      : allRecords;

    const docs = filtered
      .map((rec) => mapDocumentEnvelope(rec, apiPublicUrl))
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

    await mediaStorageRepo.writeJsonCache(DOCUMENTS_CACHE_KEY, docs);
    return docs;
  }

  async function getAllDocumentsCached(opts?: {
    bypassCache?: boolean;
  }): Promise<StandardDocumentDto[]> {
    if (!opts?.bypassCache) {
      const cached = await mediaStorageRepo.readJsonCache<StandardDocumentDto[]>(
        DOCUMENTS_CACHE_KEY,
        DOCUMENTS_CACHE_TTL_MS
      );
      if (cached) return cached;
    }
    return fetchAllDocumentsFromPds();
  }

  async function uploadStagingCoverToPds(
    coverImageKey: string
  ): Promise<AtprotoBlobRef | undefined> {
    const obj = await mediaStorageRepo.getObject(coverImageKey);
    if (!obj) return undefined;
    const buffer = await obj.arrayBuffer();
    if (buffer.byteLength > MAX_PDS_COVER_IMAGE_BYTES) {
      throw BlogErrors.mediaTooLarge(MAX_PDS_COVER_IMAGE_BYTES, "cover");
    }
    const mimeType = obj.httpMetadata?.contentType || "image/jpeg";
    try {
      return await atprotoPdsRepo.uploadBlob(buffer, mimeType);
    } catch (err) {
      mapXrpcError("uploadBlob", err);
    }
  }

  return {
    async listPublicPosts(): Promise<StandardDocumentSummaryDto[]> {
      const docs = await getAllDocumentsCached();
      return docs.map(toSummary);
    },

    async listPublicPostsFull(): Promise<StandardDocumentDto[]> {
      return getAllDocumentsCached();
    },

    async getPublicPostBySlug(slug: string): Promise<StandardDocumentDto> {
      const cleanSlug = slug.trim().toLowerCase();
      const docs = await getAllDocumentsCached();
      const match = docs.find(
        (doc) => doc.slug.toLowerCase() === cleanSlug || doc.rkey === cleanSlug
      );
      if (!match) {
        throw BlogErrors.postNotFound();
      }
      return match;
    },

    async getStudioPostByRkey(rkey: string): Promise<StandardDocumentDto> {
      try {
        const record = await atprotoPdsRepo.getRecord<StandardDocumentRecord>(
          STANDARD_DOCUMENT_COLLECTION,
          rkey
        );
        if (!record) {
          throw BlogErrors.postNotFound();
        }
        return mapDocumentEnvelope(record, apiPublicUrl);
      } catch (err) {
        if (err instanceof AtprotoXrpcError) {
          mapXrpcError("getRecord", err);
        }
        throw err;
      }
    },

    async refreshCache(): Promise<{
      publicationUri: string | null;
      postCount: number;
    }> {
      await publicationService.invalidateCache();
      await mediaStorageRepo.deleteJsonCache(DOCUMENTS_CACHE_KEY);
      const publication = await publicationService.getPublication({
        bypassCache: true,
      });
      const docs = await fetchAllDocumentsFromPds();
      return {
        publicationUri: publication?.uri ?? null,
        postCount: docs.length,
      };
    },

    async publishDraft(
      draftId: string,
      input: PublishDraftInput
    ): Promise<StandardDocumentDto> {
      const draft = await draftRepo.findById(draftId);
      if (!draft) {
        throw BlogErrors.draftNotFound();
      }

      const missing: string[] = [];
      if (!draft.title.trim()) missing.push("title");
      if (!draft.slug.trim()) missing.push("slug");
      if (!draft.markdown.trim()) missing.push("markdown");
      if (missing.length > 0) {
        throw BlogErrors.draftIncompleteForPublish(missing);
      }

      const publication = await publicationService.getPublication({
        bypassCache: true,
      });
      if (!publication) {
        throw BlogErrors.publicationNotInitialized();
      }

      const existingDocs = await getAllDocumentsCached({ bypassCache: true });
      const conflicting = existingDocs.find(
        (d) => d.slug.toLowerCase() === draft.slug.toLowerCase()
      );
      if (conflicting) {
        throw BlogErrors.slugAlreadyExists(draft.slug);
      }

      let coverBlobRef: AtprotoBlobRef | undefined;
      if (draft.cover_image_key) {
        coverBlobRef = await uploadStagingCoverToPds(draft.cover_image_key);
      }

      const tags: string[] = (() => {
        try {
          const parsed = JSON.parse(draft.tags_json) as unknown;
          return Array.isArray(parsed)
            ? parsed.filter((t): t is string => typeof t === "string")
            : [];
        } catch {
          return [];
        }
      })();

      const publishedAt = input.publishedAt || new Date().toISOString();
      const plainText = stripMarkdownToPlainText(draft.markdown);
      const description = buildExcerpt(draft.description, plainText);
      const path = normalizePostPath(draft.slug);
      const rkey = generateTid();

      const documentRecord: StandardDocumentRecord = {
        $type: STANDARD_DOCUMENT_COLLECTION,
        site: publication.uri,
        title: draft.title.trim(),
        publishedAt,
        path,
        ...(description ? { description } : {}),
        ...(coverBlobRef ? { coverImage: coverBlobRef } : {}),
        content: {
          $type: BLOG_MARKDOWN_LEXICON,
          markdown: draft.markdown,
        },
        textContent: plainText,
        ...(tags.length > 0 ? { tags } : {}),
      };

      let docRef;
      try {
        docRef = await atprotoPdsRepo.createRecord(
          STANDARD_DOCUMENT_COLLECTION,
          documentRecord,
          rkey
        );
      } catch (err) {
        mapXrpcError("createDocument", err);
      }

      const shouldCrosspost =
        input.crosspostToBsky ?? draft.crosspost_to_bsky;

      if (shouldCrosspost) {
        const teaserText =
          input.bskyTeaser?.trim() ||
          draft.bsky_teaser.trim() ||
          buildDefaultBskyTeaser({
            title: documentRecord.title,
            description,
            tags,
          });
        const facets = detectBskyFacets(teaserText);
        const articleUrl = `${canonicalOrigin}${path}`;

        const bskyRecord: BskyFeedPostRecord = {
          $type: BSKY_POST_COLLECTION,
          text: teaserText,
          createdAt: publishedAt,
          ...(facets.length > 0 ? { facets } : {}),
          embed: {
            $type: "app.bsky.embed.external",
            external: {
              uri: articleUrl,
              title: documentRecord.title,
              description: description || documentRecord.title,
              ...(coverBlobRef ? { thumb: coverBlobRef } : {}),
            },
          },
          langs: ["en"],
        };

        try {
          const bskyRef = await atprotoPdsRepo.createRecord(
            BSKY_POST_COLLECTION,
            bskyRecord
          );
          documentRecord.bskyPostRef = bskyRef;
          docRef = await atprotoPdsRepo.putRecord(
            STANDARD_DOCUMENT_COLLECTION,
            rkey,
            documentRecord
          );
        } catch (err) {
          mapXrpcError("crosspostToBluesky", err);
        }
      }

      // Clean up private draft and staging cover after PDS publish succeeds
      await draftRepo.delete(draft.id);
      if (draft.cover_image_key) {
        await mediaStorageRepo.deleteObject(draft.cover_image_key);
      }

      // Rebuild cache immediately
      await fetchAllDocumentsFromPds();

      return mapDocumentEnvelope(
        {
          uri: docRef.uri,
          cid: docRef.cid,
          value: documentRecord,
        },
        apiPublicUrl
      );
    },

    async updatePublishedPost(
      rkey: string,
      input: UpdatePublishedPostInput
    ): Promise<StandardDocumentDto> {
      let existingEnvelope: AtprotoRecordEnvelope<StandardDocumentRecord> | null;
      try {
        existingEnvelope =
          await atprotoPdsRepo.getRecord<StandardDocumentRecord>(
            STANDARD_DOCUMENT_COLLECTION,
            rkey
          );
      } catch (err) {
        mapXrpcError("getRecord", err);
      }

      if (!existingEnvelope) {
        throw BlogErrors.postNotFound();
      }

      const existingDocs = await getAllDocumentsCached({ bypassCache: true });
      const conflicting = existingDocs.find(
        (d) =>
          d.rkey !== rkey && d.slug.toLowerCase() === input.slug.toLowerCase()
      );
      if (conflicting) {
        throw BlogErrors.slugAlreadyExists(input.slug);
      }

      let coverImage: AtprotoBlobRef | undefined = input.keepExistingCover
        ? existingEnvelope.value.coverImage
        : undefined;

      if (input.coverImageKey) {
        coverImage = await uploadStagingCoverToPds(input.coverImageKey);
      }

      const plainText = stripMarkdownToPlainText(input.markdown);
      const description = buildExcerpt(input.description ?? "", plainText);
      const path = normalizePostPath(input.slug);

      const updatedRecord: StandardDocumentRecord = {
        ...existingEnvelope.value,
        $type: STANDARD_DOCUMENT_COLLECTION,
        title: input.title.trim(),
        path,
        updatedAt: new Date().toISOString(),
        content: {
          $type: BLOG_MARKDOWN_LEXICON,
          markdown: input.markdown,
        },
        textContent: plainText,
      };

      if (description) {
        updatedRecord.description = description;
      } else {
        delete updatedRecord.description;
      }

      if (input.tags && input.tags.length > 0) {
        updatedRecord.tags = input.tags;
      } else {
        delete updatedRecord.tags;
      }

      if (coverImage) {
        updatedRecord.coverImage = coverImage;
      } else {
        delete updatedRecord.coverImage;
      }

      let ref;
      try {
        ref = await atprotoPdsRepo.putRecord(
          STANDARD_DOCUMENT_COLLECTION,
          rkey,
          updatedRecord
        );
      } catch (err) {
        mapXrpcError("putRecord", err);
      }

      if (input.coverImageKey) {
        await mediaStorageRepo.deleteObject(input.coverImageKey);
      }

      await fetchAllDocumentsFromPds();

      return mapDocumentEnvelope(
        {
          uri: ref.uri,
          cid: ref.cid,
          value: updatedRecord,
        },
        apiPublicUrl
      );
    },

    async unpublishPost(
      rkey: string,
      authorId: string,
      input: UnpublishPostInput
    ): Promise<{ draft: DraftDto; deletedBskyPost: boolean }> {
      let existingEnvelope: AtprotoRecordEnvelope<StandardDocumentRecord> | null;
      try {
        existingEnvelope =
          await atprotoPdsRepo.getRecord<StandardDocumentRecord>(
            STANDARD_DOCUMENT_COLLECTION,
            rkey
          );
      } catch (err) {
        mapXrpcError("getRecord", err);
      }

      if (!existingEnvelope) {
        throw BlogErrors.postNotFound();
      }

      const doc = mapDocumentEnvelope(existingEnvelope, apiPublicUrl);
      const now = Math.floor(Date.now() / 1000);

      // Move content back into a D1 draft BEFORE deleting from PDS so nothing is ever lost
      const existingDraftWithSlug = await draftRepo.findBySlug(doc.slug);
      const targetSlug = existingDraftWithSlug
        ? `${doc.slug}-${Date.now().toString(36)}`
        : doc.slug;

      const restoredRow = await draftRepo.create({
        id: crypto.randomUUID(),
        author_id: authorId,
        title: doc.title,
        slug: targetSlug,
        description: doc.description,
        markdown: doc.markdown,
        tags_json: JSON.stringify(doc.tags),
        cover_image_key: null,
        bsky_teaser: "",
        crosspost_to_bsky: true,
        created_at: now,
        updated_at: now,
      });

      try {
        await atprotoPdsRepo.deleteRecord(STANDARD_DOCUMENT_COLLECTION, rkey);
      } catch (err) {
        mapXrpcError("deleteDocument", err);
      }

      let deletedBskyPost = false;
      if (input.deleteBskyPost && doc.bskyPostRef?.uri) {
        const parsedBsky = parseAtUri(doc.bskyPostRef.uri);
        if (parsedBsky && parsedBsky.collection === BSKY_POST_COLLECTION) {
          try {
            await atprotoPdsRepo.deleteRecord(
              BSKY_POST_COLLECTION,
              parsedBsky.rkey
            );
            deletedBskyPost = true;
          } catch {
            // Do not fail the unpublish if Bluesky post was already deleted manually
          }
        }
      }

      await fetchAllDocumentsFromPds();

      const draft: DraftDto = {
        id: restoredRow.id,
        authorId: restoredRow.author_id,
        title: restoredRow.title,
        slug: restoredRow.slug,
        description: restoredRow.description,
        markdown: restoredRow.markdown,
        tags: doc.tags,
        coverImageKey: restoredRow.cover_image_key,
        coverImageUrl: restoredRow.cover_image_key
          ? buildMediaPublicUrl(apiPublicUrl, restoredRow.cover_image_key)
          : null,
        bskyTeaser: restoredRow.bsky_teaser,
        crosspostToBsky: restoredRow.crosspost_to_bsky,
        createdAt: restoredRow.created_at,
        updatedAt: restoredRow.updated_at,
      };

      return { draft, deletedBskyPost };
    },
  };
}

export type PostService = ReturnType<typeof createPostService>;
