import { Link } from "react-router";
import { Badge, Button } from "@niwa/ui/components";
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
  starting: { label: "Starting Camera...", variant: "info" },
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
    <header className="border-b border-neutral-800 bg-neutral-900/60 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/"
          className="text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Labs
        </Link>
        <span className="text-neutral-700">/</span>
        <h1 className="text-sm font-semibold tracking-tight text-neutral-100">
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

      <div className="flex items-center gap-2">
        {historyCount > 0 && (
          <Button variant="danger" size="sm" onClick={onClearHistory}>
            Clear History ({historyCount})
          </Button>
        )}
      </div>
    </header>
  );
}
