"use client";

import * as React from "react";
import { renderMarkdownToHtml } from "@/lib/markdown";

interface MarkdownPreviewProps {
  markdown: string;
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  const [html, setHtml] = React.useState("");

  React.useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      renderMarkdownToHtml(markdown)
        .then((rendered) => {
          if (active) setHtml(rendered);
        })
        .catch(() => {
          // ignore transient preview error
        });
    }, 120);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [markdown]);

  if (!markdown.trim()) {
    return (
      <p className="text-sm italic text-muted-foreground">
        Start writing Markdown to see a live preview...
      </p>
    );
  }

  return (
    <div
      className="blog-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
