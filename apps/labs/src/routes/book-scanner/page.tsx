import { QueryClientProvider } from "@tanstack/react-query";
import { BarcodeScannerProvider } from "react-barcode-scanner";
import {
  BookDetailCard,
  CameraViewport,
  ScanHistoryList,
  ScannerHeader,
} from "./_components";
import { useBookScanner } from "./_hooks";
import { bookScannerQueryClient } from "./_utils/query-client";
import BookScannerMeta from "./meta";

function BookScannerContent() {
  const {
    activeIsbn,
    manualInput,
    setManualInput,
    validationError,
    history,
    book,
    isLoadingBook,
    isCachedHit,
    bookError,
    selectIsbn,
    handleManualSubmit,
    handleRemoveFromHistory,
    handleClearHistory,
    scanner,
  } = useBookScanner();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <BookScannerMeta />

      <ScannerHeader
        cameraStatus={scanner.cameraStatus}
        historyCount={history.length}
        onClearHistory={handleClearHistory}
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] divide-y lg:divide-y-0 lg:divide-x divide-neutral-800">
        <main className="flex flex-col min-w-0">
          <CameraViewport
            cameraStatus={scanner.cameraStatus}
            cameraError={scanner.cameraError}
            facingMode={scanner.facingMode}
            lastRawBarcode={scanner.lastRawBarcode}
            supportedFormats={scanner.supportedFormats}
            activeIsbn={activeIsbn}
            manualInput={manualInput}
            validationError={validationError}
            onChangeManualInput={setManualInput}
            onManualSubmit={handleManualSubmit}
            onSelectPreset={selectIsbn}
            onStartCamera={scanner.startCamera}
            onStopCamera={scanner.stopCamera}
            onToggleFacingMode={scanner.toggleFacingMode}
            onCapture={scanner.handleCapture}
            onCameraError={scanner.handleCameraError}
            onScanError={scanner.handleScanError}
            onScanImageFile={(file) => void scanner.scanImageFile(file)}
          />

          <BookDetailCard
            activeIsbn={activeIsbn}
            book={book}
            isLoading={isLoadingBook}
            isCachedHit={isCachedHit}
            error={bookError}
          />
        </main>

        <ScanHistoryList
          history={history}
          activeIsbn={activeIsbn}
          onSelectBook={(isbn) => {
            setManualInput(isbn);
            selectIsbn(isbn);
          }}
          onRemoveBook={handleRemoveFromHistory}
        />
      </div>
    </div>
  );
}

export default function BookScannerPage() {
  return (
    <QueryClientProvider client={bookScannerQueryClient}>
      <BarcodeScannerProvider>
        <BookScannerContent />
      </BarcodeScannerProvider>
    </QueryClientProvider>
  );
}
