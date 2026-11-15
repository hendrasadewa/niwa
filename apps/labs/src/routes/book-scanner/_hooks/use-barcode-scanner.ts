import { useCallback, useRef, useState } from "react";
import "react-barcode-scanner/polyfill";
import { BarcodeFormat, type DetectedBarcode } from "react-barcode-scanner";
import type { ScannerCameraStatus } from "../_types";
import { isValidIsbn, normalizeIsbn } from "../_utils/isbn";

const SCAN_COOLDOWN_MS = 2500;
const SUPPORTED_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
];

interface UseBarcodeScannerOptions {
  onIsbnDetected: (isbn: string) => void;
}

export function useBarcodeScanner({ onIsbnDetected }: UseBarcodeScannerOptions) {
  const lastDetectedRef = useRef<{ isbn: string; timestamp: number } | null>(
    null
  );

  const [cameraStatus, setCameraStatus] = useState<ScannerCameraStatus>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );
  const [lastRawBarcode, setLastRawBarcode] = useState<string | null>(null);

  const processDetectedCodes = useCallback(
    (codes: DetectedBarcode[]): boolean => {
      for (const code of codes) {
        const raw = code.rawValue?.trim();
        if (!raw) continue;

        setLastRawBarcode(raw);
        const normalized = normalizeIsbn(raw);

        if (!isValidIsbn(normalized)) {
          continue;
        }

        const now = Date.now();
        const prev = lastDetectedRef.current;
        if (
          prev &&
          prev.isbn === normalized &&
          now - prev.timestamp < SCAN_COOLDOWN_MS
        ) {
          return false;
        }

        lastDetectedRef.current = { isbn: normalized, timestamp: now };
        onIsbnDetected(normalized);
        return true;
      }
      return false;
    },
    [onIsbnDetected]
  );

  const handleCapture = useCallback(
    (barcodes: DetectedBarcode[]) => {
      if (barcodes.length > 0) {
        processDetectedCodes(barcodes);
      }
    },
    [processDetectedCodes]
  );

  const handleCameraError = useCallback((error: Error) => {
    const isPermission =
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError";

    setCameraStatus(isPermission ? "permission-denied" : "error");
    setCameraError(
      isPermission
        ? "Camera permission was denied. Allow camera access in your browser address bar or use manual ISBN lookup."
        : error.message || "Failed to start camera stream."
    );
  }, []);

  const handleScanError = useCallback((error: Error) => {
    setCameraError(error.message || "Error while scanning barcode frame.");
  }, []);

  const startCamera = useCallback(() => {
    setCameraError(null);
    setCameraStatus("scanning");
  }, []);

  const stopCamera = useCallback(() => {
    setCameraStatus("idle");
  }, []);

  const toggleFacingMode = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);

  const scanImageFile = useCallback(
    async (file: File) => {
      setCameraError(null);

      try {
        const DetectorCtor = (
          window as unknown as {
            BarcodeDetector?: new (opts?: { formats?: string[] }) => {
              detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
            };
          }
        ).BarcodeDetector;

        if (!DetectorCtor) {
          setCameraError(
            "BarcodeDetector polyfill is still initializing. Please try again in a moment."
          );
          return;
        }

        const detector = new DetectorCtor({ formats: SUPPORTED_FORMATS });
        const bitmap = await createImageBitmap(file);
        const codes = await detector.detect(bitmap);
        bitmap.close();

        if (codes.length === 0) {
          setCameraError(
            "No barcode detected in the selected image. Try a clearer photo of the book's back cover barcode."
          );
          return;
        }

        const matched = processDetectedCodes(codes);
        if (!matched) {
          const rawSeen = codes.map((c) => c.rawValue).join(", ");
          setCameraError(
            `Detected barcode (${rawSeen}), but it is not a valid Bookland ISBN-13 (978/979) or ISBN-10.`
          );
        }
      } catch (err) {
        setCameraError(
          err instanceof Error
            ? err.message
            : "Could not decode barcode from image file."
        );
      }
    },
    [processDetectedCodes]
  );

  return {
    cameraStatus,
    cameraError,
    facingMode,
    lastRawBarcode,
    supportedFormats: SUPPORTED_FORMATS,
    startCamera,
    stopCamera,
    toggleFacingMode,
    handleCapture,
    handleCameraError,
    handleScanError,
    scanImageFile,
  };
}
