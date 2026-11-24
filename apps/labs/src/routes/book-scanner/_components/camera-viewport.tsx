import { useRef } from "react";
import {
  BarcodeScanner,
  type BarcodeFormat,
  type DetectedBarcode,
} from "react-barcode-scanner";
import { Alert, Badge, Button, TextInput } from "@niwa/ui/components";
import type { ScannerCameraStatus } from "../_types";
import { SAMPLE_BOOK_PRESETS } from "../_utils/isbn";

interface CameraViewportProps {
  cameraStatus: ScannerCameraStatus;
  cameraError: string | null;
  facingMode: "environment" | "user";
  lastRawBarcode: string | null;
  supportedFormats: BarcodeFormat[];
  activeIsbn: string | null;
  manualInput: string;
  validationError: string | null;
  onChangeManualInput: (val: string) => void;
  onManualSubmit: (e: React.FormEvent) => void;
  onSelectPreset: (isbn: string) => void;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onToggleFacingMode: () => void;
  onCapture: (barcodes: DetectedBarcode[]) => void;
  onCameraError: (error: Error) => void;
  onScanError: (error: Error) => void;
  onScanImageFile: (file: File) => void;
}

export function CameraViewport({
  cameraStatus,
  cameraError,
  facingMode,
  lastRawBarcode,
  supportedFormats,
  activeIsbn,
  manualInput,
  validationError,
  onChangeManualInput,
  onManualSubmit,
  onSelectPreset,
  onStartCamera,
  onStopCamera,
  onToggleFacingMode,
  onCapture,
  onCameraError,
  onScanError,
  onScanImageFile,
}: CameraViewportProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isScanning = cameraStatus === "scanning";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onScanImageFile(file);
      e.target.value = "";
    }
  };

  return (
    <section className="p-6 space-y-5 border-b border-border bg-surface/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            1. Barcode Scanner &amp; ISBN Input
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Powered by{" "}
            <code className="font-mono text-foreground">
              react-barcode-scanner
            </code>{" "}
            (WASM ZBar polyfill + EAN-13). Scan via camera, upload a barcode
            photo, or enter an ISBN manually.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isScanning ? (
            <>
              <Button variant="secondary" size="sm" onClick={onToggleFacingMode}>
                Flip Camera ({facingMode === "environment" ? "Rear" : "Front"})
              </Button>
              <Button variant="danger" size="sm" onClick={onStopCamera}>
                Stop Camera
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={onStartCamera}>
              Start Camera Scanner
            </Button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            title="Upload or snap a photo of a book barcode"
          >
            Scan Photo
          </Button>
        </div>
      </div>

      {/* Camera Viewfinder */}
      <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface-muted/70 shadow-[var(--shadow-inset)] aspect-video max-h-64 w-full flex items-center justify-center">
        {isScanning ? (
          <>
            <BarcodeScanner
              className="h-full w-full object-cover"
              options={{
                formats: supportedFormats,
                delay: 300,
              }}
              trackConstraints={{
                facingMode: { ideal: facingMode },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }}
              onCapture={onCapture}
              onCameraError={onCameraError}
              onScanError={onScanError}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-64 h-28 rounded-[var(--radius-lg)] border-2 border-primary shadow-[0_0_0_9999px_rgba(22,24,22,0.45)] relative flex items-center justify-center">
                <div className="w-full h-0.5 bg-primary animate-pulse" />
              </div>
              <span className="mt-2.5 rounded-full border border-border bg-surface/90 px-3 py-1 text-[11px] font-mono text-foreground shadow-[var(--shadow-card)]">
                Align book EAN-13 barcode inside frame
              </span>
            </div>
          </>
        ) : (
          <div className="text-center px-6 py-8 space-y-2">
            <p className="font-serif text-base font-medium text-foreground">
              Camera scanner is paused
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Click &quot;Start Camera Scanner&quot; to scan book barcodes in real
              time across any browser, or use the manual ISBN input / sample
              presets below.
            </p>
          </div>
        )}

        {lastRawBarcode && (
          <div className="absolute bottom-2.5 right-2.5">
            <Badge variant="neutral" mono>
              Last Read: {lastRawBarcode}
            </Badge>
          </div>
        )}
      </div>

      {cameraError && <Alert variant="warning">{cameraError}</Alert>}
      {validationError && <Alert variant="error">{validationError}</Alert>}

      {/* Manual ISBN Lookup Form */}
      <search>
        <form onSubmit={onManualSubmit} className="flex flex-wrap items-center gap-2.5">
          <TextInput
            type="search"
            value={manualInput}
            onChange={(e) => onChangeManualInput(e.target.value)}
            placeholder="Enter ISBN-13 (e.g. 978-1-4493-7332-0) or ISBN-10..."
            aria-label="Manual ISBN-13 or ISBN-10 lookup"
            className="flex-1 min-w-[240px] font-mono text-xs"
          />
          <Button type="submit" variant="primary" size="md">
            Lookup ISBN
          </Button>
        </form>
      </search>

      {/* Quick-test Sample Book Presets */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Quick sample ISBNs (click to simulate scan):
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_BOOK_PRESETS.map((preset) => {
            const isSelected = activeIsbn === preset.isbn;
            return (
              <Button
                key={preset.isbn}
                variant={isSelected ? "primary" : "soft"}
                size="xs"
                onClick={() => {
                  onChangeManualInput(preset.isbn);
                  onSelectPreset(preset.isbn);
                }}
                title={`${preset.label} (${preset.note})`}
              >
                <span className="font-mono">{preset.isbn}</span>
                <span className="opacity-80 truncate max-w-[160px]">
                  · {preset.label}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
