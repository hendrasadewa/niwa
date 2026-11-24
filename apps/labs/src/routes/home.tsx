import { Link } from "react-router";
import {
  Badge,
  Card,
  ColorSchemeToggle,
  PageHeader,
} from "@niwa/ui/components";

const LAB_DEMOS = [
  {
    to: "/demos/design-tokens",
    title: "Niwa Design System & @niwa/ui",
    badge: { label: "Tokens + UI", variant: "primary" as const },
    description:
      "Interactive study of @niwa/ui Botanical Sage base, Auth Terracotta, Preorder Waterlily Pink, Playfair Display + Open Sans typography, and every shared component.",
    tags: ["@niwa/ui", "Tailwind v4", "Light / Dark"],
  },
  {
    to: "/demos/sqlite",
    title: "SQLite WASM Client",
    badge: { label: "OPFS + Worker", variant: "success" as const },
    description:
      "Browser-native SQLite client powered by @sqlite.org/sqlite-wasm and OPFS persistence inside a dedicated Web Worker.",
    tags: ["SQLite WASM", "OPFS", "DataTable"],
  },
  {
    to: "/demos/book-scanner",
    title: "Book Barcode (ISBN) Scanner",
    badge: { label: "EAN-13 + Cache", variant: "info" as const },
    description:
      "Scan book EAN-13 barcodes via camera or photo upload to fetch edition metadata from Open Library API with TanStack Query caching.",
    tags: ["ZBar WASM", "Open Library", "TanStack Query"],
  },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14 space-y-10">
        <PageHeader
          kicker="NIWA / LABS"
          title="Interactive experiments & prototypes"
          description="A quiet workshop for testing browser primitives, WASM tools, and the shared @niwa/ui design system."
          actions={<ColorSchemeToggle />}
        />

        <ul className="grid grid-cols-1 gap-4">
          {LAB_DEMOS.map((demo) => (
            <li key={demo.to}>
              <Link
                to={demo.to}
                className="group block rounded-[var(--radius-2xl)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                <Card
                  className="transition-all duration-150 group-hover:border-primary/50 group-hover:shadow-[var(--shadow-elevated)]"
                  contentClassName="space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-serif text-xl font-medium tracking-[-0.01em] text-foreground group-hover:text-primary transition-colors">
                      {demo.title}
                    </h2>
                    <Badge variant={demo.badge.variant} dot>
                      {demo.badge.label}
                    </Badge>
                  </div>

                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {demo.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {demo.tags.map((tag) => (
                        <Badge key={tag} variant="neutral" mono>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-xs font-medium text-primary group-hover:translate-x-0.5 transition-transform">
                      Open experiment →
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
