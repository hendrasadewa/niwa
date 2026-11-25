import type {
  CreateDraftInput,
  DraftDto,
  UpdateDraftInput,
} from "@niwa/blog-validators";
import type { DraftRow } from "../db/schema";
import { BlogErrors } from "../errors/blog";
import type { DraftRepo } from "../repositories/drafts";
import type { MediaStorageRepo } from "../repositories/media-storage";
import { slugify } from "../utils/markdown";
import { buildMediaPublicUrl } from "./media";

export interface DraftServiceDeps {
  draftRepo: DraftRepo;
  mediaStorageRepo: MediaStorageRepo;
  apiPublicUrl: string;
}

function parseTags(tagsJson: string): string[] {
  try {
    const parsed = JSON.parse(tagsJson) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === "string")
      : [];
  } catch {
    return [];
  }
}

function mapDraftRow(row: DraftRow, apiPublicUrl: string): DraftDto {
  return {
    id: row.id,
    authorId: row.author_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    markdown: row.markdown,
    tags: parseTags(row.tags_json),
    coverImageKey: row.cover_image_key,
    coverImageUrl: row.cover_image_key
      ? buildMediaPublicUrl(apiPublicUrl, row.cover_image_key)
      : null,
    bskyTeaser: row.bsky_teaser,
    crosspostToBsky: row.crosspost_to_bsky,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createDraftService({
  draftRepo,
  mediaStorageRepo,
  apiPublicUrl,
}: DraftServiceDeps) {
  return {
    async listDrafts(authorId: string): Promise<DraftDto[]> {
      const rows = await draftRepo.listByAuthor(authorId);
      return rows.map((row) => mapDraftRow(row, apiPublicUrl));
    },

    async getDraft(id: string): Promise<DraftDto> {
      const row = await draftRepo.findById(id);
      if (!row) {
        throw BlogErrors.draftNotFound();
      }
      return mapDraftRow(row, apiPublicUrl);
    },

    async createDraft(
      authorId: string,
      input: CreateDraftInput
    ): Promise<DraftDto> {
      const now = Math.floor(Date.now() / 1000);
      const baseSlug = input.slug || slugify(input.title || "untitled");
      const existingSlug = await draftRepo.findBySlug(baseSlug);
      const slug = existingSlug
        ? `${baseSlug}-${Date.now().toString(36)}`
        : baseSlug;

      const created = await draftRepo.create({
        id: crypto.randomUUID(),
        author_id: authorId,
        title: input.title ?? "",
        slug,
        description: input.description ?? "",
        markdown: input.markdown ?? "",
        tags_json: JSON.stringify(input.tags ?? []),
        cover_image_key: input.coverImageKey ?? null,
        bsky_teaser: input.bskyTeaser ?? "",
        crosspost_to_bsky: input.crosspostToBsky ?? true,
        created_at: now,
        updated_at: now,
      });

      return mapDraftRow(created, apiPublicUrl);
    },

    async updateDraft(
      id: string,
      input: UpdateDraftInput
    ): Promise<DraftDto> {
      const existing = await draftRepo.findById(id);
      if (!existing) {
        throw BlogErrors.draftNotFound();
      }

      if (input.slug && input.slug !== existing.slug) {
        const conflict = await draftRepo.findBySlug(input.slug, id);
        if (conflict) {
          throw BlogErrors.slugAlreadyExists(input.slug);
        }
      }

      if (
        input.coverImageKey !== undefined &&
        existing.cover_image_key &&
        existing.cover_image_key !== input.coverImageKey
      ) {
        await mediaStorageRepo.deleteObject(existing.cover_image_key);
      }

      const updated = await draftRepo.update(id, {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.markdown !== undefined ? { markdown: input.markdown } : {}),
        ...(input.tags !== undefined
          ? { tags_json: JSON.stringify(input.tags) }
          : {}),
        ...(input.coverImageKey !== undefined
          ? { cover_image_key: input.coverImageKey }
          : {}),
        ...(input.bskyTeaser !== undefined
          ? { bsky_teaser: input.bskyTeaser }
          : {}),
        ...(input.crosspostToBsky !== undefined
          ? { crosspost_to_bsky: input.crosspostToBsky }
          : {}),
        updated_at: Math.floor(Date.now() / 1000),
      });

      if (!updated) {
        throw BlogErrors.draftNotFound();
      }

      return mapDraftRow(updated, apiPublicUrl);
    },

    async deleteDraft(id: string): Promise<void> {
      const existing = await draftRepo.findById(id);
      if (!existing) {
        throw BlogErrors.draftNotFound();
      }
      if (existing.cover_image_key) {
        await mediaStorageRepo.deleteObject(existing.cover_image_key);
      }
      await draftRepo.delete(id);
    },
  };
}

export type DraftService = ReturnType<typeof createDraftService>;
