import { useRef } from "react";
import {
  BarcodeScanner,
  type BarcodeFormat,
  type DetectedBarcode,
} from "react-barcode-scanner";
import { Alert, Badge, Button } from "@niwa/ui/components";
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
    <section className="p-6 space-y-5 border-b border-neutral-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            1. Barcode Scanner & ISBN Input
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Powered by <code className="text-neutral-300">react-barcode-scanner</code>{" "}
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
      <div className="relative overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/70 aspect-video max-h-64 w-full flex items-center justify-center">
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
              <div className="w-64 h-28 rounded-lg border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(10,10,10,0.45)] relative flex items-center justify-center">
                <div className="w-full h-0.5 bg-emerald-400/70 animate-pulse" />
              </div>
              <span className="mt-2 rounded bg-neutral-950/80 px-2.5 py-1 text-[11px] font-mono text-neutral-200">
                Align book EAN-13 barcode inside frame
              </span>
            </div>
          </>
        ) : (
          <div className="text-center px-6 py-8 space-y-2">
            <p className="text-xs font-medium text-neutral-300">
              Camera scanner is paused
            </p>
            <p className="text-[11px] text-neutral-500 max-w-md mx-auto">
              Click &quot;Start Camera Scanner&quot; to scan book barcodes in real
              time across any browser, or use the manual ISBN input / sample
              presets below.
            </p>
          </div>
        )}

        {lastRawBarcode && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="neutral" mono>
              Last Read: {lastRawBarcode}
            </Badge>
          </div>
        )}
      </div>

      {cameraError && <Alert variant="warning">{cameraError}</Alert>}
      {validationError && <Alert variant="error">{validationError}</Alert>}

      {/* Manual ISBN Lookup Form */}
      <form onSubmit={onManualSubmit} className="flex flex-wrap gap-2">
        <input
          type="text"
          value={manualInput}
          onChange={(e) => onChangeManualInput(e.target.value)}
          placeholder="Enter ISBN-13 (e.g. 978-1-4493-7332-0) or ISBN-10..."
          className="flex-1 min-w-[240px] rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-mono text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
        />
        <Button type="submit" variant="primary" size="md">
          Lookup ISBN
        </Button>
      </form>

      {/* Quick-test Sample Book Presets */}
      <div className="space-y-1.5">
        <div className="text-[11px] text-neutral-400">
          Quick sample ISBNs (click to simulate scan):
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_BOOK_PRESETS.map((preset) => {
            const isSelected = activeIsbn === preset.isbn;
            return (
              <Button
                key={preset.isbn}
                variant={isSelected ? "primary" : "secondary"}
                size="xs"
                onClick={() => {
                  onChangeManualInput(preset.isbn);
                  onSelectPreset(preset.isbn);
                }}
                title={`${preset.label} (${preset.note})`}
              >
                <span className="font-mono">{preset.isbn}</span>
                <span className="ml-1.5 opacity-80 truncate max-w-[160px]">
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
