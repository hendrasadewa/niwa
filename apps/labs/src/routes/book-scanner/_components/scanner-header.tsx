import { Link } from "react-router";
import { Badge, Button, ColorSchemeToggle } from "@niwa/ui/components";
import type { ScannerCameraStatus } from "../_types";

interface ScannerHeaderProps {
  cameraStatus: ScannerCameraStatus;
  historyCount: number;
  onClearHistory: () => void;
}

const cameraBadgeConfig: Record<
  ScannerCameraStatus,
  { label: string; variant: "neutral" | "success" | "warning" | "danger" | "info" }
> = {
  idle: { label: "Camera Idle", variant: "neutral" },
  starting: { label: "Starting Camera…", variant: "info" },
  scanning: { label: "Live EAN-13 Scanner", variant: "success" },
  unsupported: { label: "Manual / Preset Mode", variant: "warning" },
  "permission-denied": { label: "Camera Blocked", variant: "danger" },
  error: { label: "Camera Error", variant: "danger" },
};

export function ScannerHeader({
  cameraStatus,
  historyCount,
  onClearHistory,
}: ScannerHeaderProps) {
  const badge = cameraBadgeConfig[cameraStatus];

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-xs px-5 py-3 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted/70 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span aria-hidden="true">←</span>
          <span>Labs</span>
        </Link>
        <h1 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
          Book Barcode (ISBN) Scanner
        </h1>
        <Badge variant={badge.variant} dot>
          {badge.label}
        </Badge>
        <Badge
          variant="info"
          mono
          title="Open Library requests are cached indefinitely per ISBN with TanStack Query and use resolved CoverIDs to respect the 100 req / 5 min rate limit."
        >
          OpenLibrary API · Cached
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ColorSchemeToggle className="hidden sm:inline-flex" />
        {historyCount > 0 && (
          <Button variant="danger" size="sm" onClick={onClearHistory}>
            Clear History ({historyCount})
          </Button>
        )}
      </div>
    </header>
  );
}
