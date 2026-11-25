import { getPublicPublication } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export async function GET() {
  const publication = await getPublicPublication();

  if (!publication?.uri) {
    return new Response("Publication not initialized", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(publication.uri, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
