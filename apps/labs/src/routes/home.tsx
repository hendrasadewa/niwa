import { Link } from "react-router";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">niwa / labs</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Interactive experiments, demos, and prototypes.
          </p>
        </div>

        <ul className="space-y-2">
          <li>
            <Link
              to="/demos/design-tokens"
              className="block rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 hover:border-neutral-700 hover:bg-neutral-900 transition-colors"
            >
              <div className="text-sm font-medium text-neutral-100">
                Niwa Design Tokens
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Interactive study of @niwa/ui botanical Sage base, Auth
                Terracotta accent, Playfair Display + Open Sans typography, and
                light/dark themes.
              </p>
            </Link>
          </li>
          <li>
            <Link
              to="/demos/sqlite"
              className="block rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 hover:border-neutral-700 hover:bg-neutral-900 transition-colors"
            >
              <div className="text-sm font-medium text-neutral-100">
                SQLite WASM Client
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Browser SQLite client powered by @sqlite.org/sqlite-wasm and
                OPFS in a Web Worker.
              </p>
            </Link>
          </li>
          <li>
            <Link
              to="/demos/book-scanner"
              className="block rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 hover:border-neutral-700 hover:bg-neutral-900 transition-colors"
            >
              <div className="text-sm font-medium text-neutral-100">
                Book Barcode (ISBN) Scanner
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Scan book EAN-13 barcodes to fetch edition metadata from Open
                Library API with TanStack Query caching.
              </p>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
