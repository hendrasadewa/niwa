import assert from "node:assert/strict";
import test from "node:test";
import { detectBskyFacets } from "../src/utils/bsky-facets.ts";
import {
  buildDefaultBskyTeaser,
  extractSlugFromPath,
  normalizePostPath,
  slugify,
  stripMarkdownToPlainText,
} from "../src/utils/markdown.ts";
import { generateTid, isValidTid, parseAtUri } from "../src/utils/tid.ts";

test("generateTid produces valid, strictly monotonic 13-char TIDs", () => {
  const first = generateTid(1_700_000_000_000, 42);
  const second = generateTid(1_700_000_000_000, 42);
  assert.equal(first.length, 13);
  assert.equal(second.length, 13);
  assert.equal(isValidTid(first), true);
  assert.equal(isValidTid(second), true);
  assert.ok(second > first, `Expected ${second} > ${first}`);
});

test("parseAtUri parses valid AT-URIs and rejects malformed ones", () => {
  assert.deepEqual(
    parseAtUri("at://did:plc:abc123/site.standard.document/3lwafzkjqm25s"),
    {
      did: "did:plc:abc123",
      collection: "site.standard.document",
      rkey: "3lwafzkjqm25s",
    }
  );
  assert.equal(parseAtUri("https://example.com"), null);
  assert.equal(parseAtUri("at://did:plc:abc123/only-two"), null);
});

test("detectBskyFacets computes accurate UTF-8 byte offsets with emojis", () => {
  const text = "🌱 New post https://blog.hendrasadewa.com/p/hello! #atproto #niwa";
  const facets = detectBskyFacets(text);
  assert.equal(facets.length, 3);

  const bytes = new TextEncoder().encode(text);
  const sliceBytes = (start: number, end: number) =>
    new TextDecoder().decode(bytes.slice(start, end));

  assert.equal(
    sliceBytes(facets[0]!.index.byteStart, facets[0]!.index.byteEnd),
    "https://blog.hendrasadewa.com/p/hello"
  );
  assert.deepEqual(facets[0]!.features, [
    {
      $type: "app.bsky.richtext.facet#link",
      uri: "https://blog.hendrasadewa.com/p/hello",
    },
  ]);

  assert.equal(
    sliceBytes(facets[1]!.index.byteStart, facets[1]!.index.byteEnd),
    "#atproto"
  );
  assert.deepEqual(facets[1]!.features, [
    { $type: "app.bsky.richtext.facet#tag", tag: "atproto" },
  ]);

  assert.equal(
    sliceBytes(facets[2]!.index.byteStart, facets[2]!.index.byteEnd),
    "#niwa"
  );
});

test("markdown utilities strip formatting, normalize paths, and generate teasers", () => {
  assert.equal(slugify("Hello, ATProto World!"), "hello-atproto-world");
  assert.equal(normalizePostPath("hello-world"), "/p/hello-world");
  assert.equal(extractSlugFromPath("/p/hello-world", "fallback"), "hello-world");
  assert.equal(extractSlugFromPath("/custom-path", "fallback"), "custom-path");

  const plain = stripMarkdownToPlainText(
    "# Heading\n\nThis is **bold** with a [link](https://example.com) and `code`."
  );
  assert.equal(plain, "Heading\n\nThis is bold with a link and code.");

  const teaser = buildDefaultBskyTeaser({
    title: "My Essay",
    description: "Short summary.",
    tags: ["atproto", "cloudflare"],
  });
  assert.ok(teaser.includes("My Essay"));
  assert.ok(teaser.includes("#atproto"));
});
