import type { AtprotoBlobRef, AtprotoStrongRef } from "@niwa/blog-validators";

export interface AtprotoSession {
  did: string;
  handle: string;
  accessJwt: string;
  refreshJwt: string;
  pdsUrl: string;
}

export interface AtprotoRecordEnvelope<T> {
  uri: string;
  cid: string;
  value: T;
}

export interface StandardPublicationRecord {
  $type: "site.standard.publication";
  url: string;
  name: string;
  description?: string;
  icon?: AtprotoBlobRef;
}

export interface BlogMarkdownContent {
  $type: "com.hendrasadewa.blog.markdown";
  markdown: string;
}

export interface StandardDocumentRecord {
  $type: "site.standard.document";
  site: string;
  title: string;
  publishedAt: string;
  updatedAt?: string;
  path?: string;
  description?: string;
  coverImage?: AtprotoBlobRef;
  content?: BlogMarkdownContent | { $type: string; text?: string; markdown?: string; [key: string]: unknown };
  textContent?: string;
  tags?: string[];
  bskyPostRef?: AtprotoStrongRef;
}

export interface BskyRichTextFacet {
  index: {
    byteStart: number;
    byteEnd: number;
  };
  features: Array<
    | { $type: "app.bsky.richtext.facet#link"; uri: string }
    | { $type: "app.bsky.richtext.facet#tag"; tag: string }
  >;
}

export interface BskyExternalEmbed {
  $type: "app.bsky.embed.external";
  external: {
    uri: string;
    title: string;
    description: string;
    thumb?: AtprotoBlobRef;
  };
}

export interface BskyFeedPostRecord {
  $type: "app.bsky.feed.post";
  text: string;
  createdAt: string;
  facets?: BskyRichTextFacet[];
  embed?: BskyExternalEmbed;
  langs?: string[];
}
