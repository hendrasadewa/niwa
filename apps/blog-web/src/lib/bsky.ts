import type { BskyThreadPostDto } from "@niwa/blog-validators";

const PUBLIC_BSKY_APPVIEW = "https://public.api.bsky.app";

interface RawBskyThreadNode {
  $type?: string;
  post?: {
    uri: string;
    cid: string;
    author: {
      did: string;
      handle: string;
      displayName?: string;
      avatar?: string;
    };
    record?: {
      text?: string;
      createdAt?: string;
    };
    likeCount?: number;
    repostCount?: number;
    replyCount?: number;
    quoteCount?: number;
  };
  replies?: RawBskyThreadNode[];
}

export function atUriToBskyWebUrl(uri: string, handle?: string): string {
  if (!uri.startsWith("at://")) return "https://bsky.app";
  const parts = uri.slice("at://".length).split("/");
  const did = parts[0];
  const rkey = parts[2];
  if (!did || !rkey) return "https://bsky.app";
  return `https://bsky.app/profile/${encodeURIComponent(handle || did)}/post/${encodeURIComponent(rkey)}`;
}

function mapThreadNode(node: RawBskyThreadNode): BskyThreadPostDto | null {
  if (!node || !node.post) return null;
  if (
    node.$type === "app.bsky.feed.defs#notFoundPost" ||
    node.$type === "app.bsky.feed.defs#blockedPost"
  ) {
    return null;
  }

  const { post } = node;
  const replies = (node.replies ?? [])
    .map(mapThreadNode)
    .filter((item): item is BskyThreadPostDto => item !== null)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  return {
    uri: post.uri,
    cid: post.cid,
    webUrl: atUriToBskyWebUrl(post.uri, post.author.handle),
    author: {
      did: post.author.did,
      handle: post.author.handle,
      displayName: post.author.displayName ?? null,
      avatar: post.author.avatar ?? null,
    },
    text: post.record?.text ?? "",
    createdAt: post.record?.createdAt ?? "",
    likeCount: post.likeCount ?? 0,
    repostCount: post.repostCount ?? 0,
    replyCount: post.replyCount ?? 0,
    quoteCount: post.quoteCount ?? 0,
    replies,
  };
}

export async function fetchBskyPostThread(
  postUri: string,
  depth = 4
): Promise<BskyThreadPostDto | null> {
  try {
    const params = new URLSearchParams({
      uri: postUri,
      depth: String(depth),
    });
    const res = await fetch(
      `${PUBLIC_BSKY_APPVIEW}/xrpc/app.bsky.feed.getPostThread?${params.toString()}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { thread?: RawBskyThreadNode };
    if (!body.thread) return null;
    return mapThreadNode(body.thread);
  } catch {
    return null;
  }
}
