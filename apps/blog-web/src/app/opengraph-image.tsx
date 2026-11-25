import { ImageResponse } from "next/og";
import { getPublicPublication } from "@/lib/server-api";

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const publication = await getPublicPublication();
  const title = publication?.name || "Hendra Sadewa";
  const description =
    publication?.description ||
    "Micro-essays, notes, and TILs on the open ATProto web.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "#f8f7f4",
          color: "#1c1f1c",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: 24,
            color: "#4a6741",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <span>blog.hendrasadewa.com</span>
          <span>·</span>
          <span>standard.site</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.4,
              color: "#525852",
              maxWidth: "920px",
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid #dfe3dc",
            paddingTop: "24px",
            fontSize: 22,
            color: "#6b726b",
          }}
        >
          <span>Published natively on ATProto</span>
          <span>niwa</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
