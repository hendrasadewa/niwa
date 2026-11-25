import type { BskyRichTextFacet } from "../types/atproto";

const encoder = new TextEncoder();

function utf16OffsetToUtf8ByteOffset(text: string, utf16Index: number): number {
  return encoder.encode(text.slice(0, utf16Index)).byteLength;
}

/**
 * Detects HTTPS URLs and #hashtags in Bluesky post text and returns
 * ATProto `app.bsky.richtext.facet` entries using exact UTF-8 byte offsets.
 */
export function detectBskyFacets(text: string): BskyRichTextFacet[] {
  const facets: BskyRichTextFacet[] = [];

  // 1. Links (https:// or http://)
  const urlRegex = /https?:\/\/[^\s<>()]+/g;
  for (const match of text.matchAll(urlRegex)) {
    if (match.index === undefined) continue;
    let rawUrl = match[0];
    while (/[.,!?;:'")\]}]/.test(rawUrl.slice(-1))) {
      rawUrl = rawUrl.slice(0, -1);
    }
    if (!rawUrl) continue;
    const byteStart = utf16OffsetToUtf8ByteOffset(text, match.index);
    const byteEnd = utf16OffsetToUtf8ByteOffset(text, match.index + rawUrl.length);
    facets.push({
      index: { byteStart, byteEnd },
      features: [{ $type: "app.bsky.richtext.facet#link", uri: rawUrl }],
    });
  }

  // 2. Hashtags (#tag preceded by start-of-string or whitespace)
  const tagRegex = /(^|\s)(#([a-zA-Z0-9_][a-zA-Z0-9_-]{0,63}))/g;
  for (const match of text.matchAll(tagRegex)) {
    if (match.index === undefined) continue;
    const prefix = match[1] ?? "";
    const fullTag = match[2];
    const tagValue = match[3];
    if (!fullTag || !tagValue) continue;
    const startUtf16 = match.index + prefix.length;
    const byteStart = utf16OffsetToUtf8ByteOffset(text, startUtf16);
    const byteEnd = utf16OffsetToUtf8ByteOffset(text, startUtf16 + fullTag.length);
    facets.push({
      index: { byteStart, byteEnd },
      features: [{ $type: "app.bsky.richtext.facet#tag", tag: tagValue }],
    });
  }

  return facets.sort((a, b) => a.index.byteStart - b.index.byteStart);
}
