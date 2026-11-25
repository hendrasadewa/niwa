import { ImageResponse } from "next/og";
import { getPublicPostBySlug, getPublicPublication } from "@/lib/server-api";

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

type OgProps = {
  params: Promise<{ slug: string }>;
};

export default async function ArticleOpenGraphImage({ params }: OgProps) {
  const { slug } = await params;
  const [post, publication] = await Promise.all([
    getPublicPostBySlug(slug),
    getPublicPublication(),
  ]);

  const title = post?.title || "Hendra Sadewa";
  const description = post?.description || "";
  const siteName = publication?.name || "Hendra Sadewa";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "68px",
          background: "#f8f7f4",
          color: "#1c1f1c",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 24,
            color: "#4a6741",
          }}
        >
          <span>{siteName}</span>
          <span>standard.site</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              fontSize: 58,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>
          {description ? (
            <div
              style={{
                fontSize: 26,
                lineHeight: 1.45,
                color: "#525852",
                maxWidth: "960px",
              }}
            >
              {description.slice(0, 180)}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid #dfe3dc",
            paddingTop: "22px",
            fontSize: 22,
            color: "#6b726b",
          }}
        >
          <span>blog.hendrasadewa.com</span>
          {post?.readingTimeMinutes ? (
            <span>{post.readingTimeMinutes} min read</span>
          ) : (
            <span>ATProto</span>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
