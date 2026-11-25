import type { Context } from "hono";
import { createAtprotoPdsRepo } from "../repositories/atproto-pds";
import { createDraftRepo } from "../repositories/drafts";
import { createMediaStorageRepo } from "../repositories/media-storage";
import { createDraftService } from "../services/drafts";
import { createMediaService } from "../services/media";
import { createPostService } from "../services/posts";
import { createPublicationService } from "../services/publication";
import type { AppEnv } from "../types/env";

function getApiPublicUrl(c: Context<AppEnv>): string {
  return (
    c.env.BLOG_API_PUBLIC_URL?.replace(/\/+$/, "") ||
    new URL(c.req.url).origin
  );
}

function getBlogPublicUrl(c: Context<AppEnv>): string {
  return (
    c.env.BLOG_PUBLIC_URL?.replace(/\/+$/, "") || "https://blog.hendrasadewa.com"
  );
}

export function getMediaStorageRepo(c: Context<AppEnv>) {
  return createMediaStorageRepo(c.env.BUCKET);
}

export function getAtprotoPdsRepo(c: Context<AppEnv>) {
  return createAtprotoPdsRepo(
    {
      defaultPdsUrl: c.env.ATPROTO_PDS_URL || "https://bsky.social",
      ownerDid: c.env.ATPROTO_OWNER_DID,
      identifier: c.env.BSKY_IDENTIFIER,
      appPassword: c.env.BSKY_APP_PASSWORD,
    },
    getMediaStorageRepo(c)
  );
}

export function getMediaService(c: Context<AppEnv>) {
  return createMediaService({
    mediaStorageRepo: getMediaStorageRepo(c),
    atprotoPdsRepo: getAtprotoPdsRepo(c),
    apiPublicUrl: getApiPublicUrl(c),
  });
}

export function getPublicationService(c: Context<AppEnv>) {
  return createPublicationService({
    atprotoPdsRepo: getAtprotoPdsRepo(c),
    mediaStorageRepo: getMediaStorageRepo(c),
    blogPublicUrl: getBlogPublicUrl(c),
    apiPublicUrl: getApiPublicUrl(c),
    configuredPublicationRkey: c.env.ATPROTO_PUBLICATION_RKEY,
  });
}

export function getPostService(c: Context<AppEnv>) {
  return createPostService({
    atprotoPdsRepo: getAtprotoPdsRepo(c),
    mediaStorageRepo: getMediaStorageRepo(c),
    draftRepo: createDraftRepo(c.get("db")),
    publicationService: getPublicationService(c),
    blogPublicUrl: getBlogPublicUrl(c),
    apiPublicUrl: getApiPublicUrl(c),
  });
}

export function getDraftService(c: Context<AppEnv>) {
  return createDraftService({
    draftRepo: createDraftRepo(c.get("db")),
    mediaStorageRepo: getMediaStorageRepo(c),
    apiPublicUrl: getApiPublicUrl(c),
  });
}
