import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  COLOR_SCHEME_STORAGE_KEY,
  applyColorScheme,
  brandThemes,
  getStoredColorScheme,
  resolveColorScheme,
  type ColorSchemePreference,
  type NiwaBrand,
} from "@niwa/ui/tokens";
import DesignTokensMeta from "./meta";
import {
  BottomNavigationSection,
  ButtonsSection,
  ControlsSection,
  NotificationSection,
  PaletteSection,
  ProfileAndEditorialSection,
  ProgressAndBadgesSection,
  SearchInputSection,
  SegmentedTabsSection,
  SemanticReferenceSection,
  TypographySection,
} from "./_components/token-sections";

export default function DesignTokensPage() {
  const [brand, setBrand] = useState<NiwaBrand>("niwa");
  const [schemePref, setSchemePref] = useState<ColorSchemePreference>(() =>
    getStoredColorScheme()
  );
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Track live OS color-scheme changes without altering stored overrides
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Sync color-scheme changes made in other browser tabs
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== COLOR_SCHEME_STORAGE_KEY) return;
      const next = getStoredColorScheme();
      setSchemePref(next);
      applyColorScheme(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleSelectScheme = useCallback((next: ColorSchemePreference) => {
    setSchemePref(next);
    applyColorScheme(next);
  }, []);

  const handleCopy = useCallback((key: string, value: string) => {
    void navigator.clipboard?.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 1400);
  }, []);

  const resolvedScheme = resolveColorScheme(schemePref, systemDark);
  const activeBrand = brandThemes[brand];

  return (
    <>
      <DesignTokensMeta />
      <div
        data-brand={activeBrand.dataBrandAttr}
        className="min-h-screen bg-background text-foreground font-sans antialiased transition-colors duration-200"
      >
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
          {/* Top Navigation Bar */}
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-[var(--shadow-card)] transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span aria-hidden="true">←</span>
              <span>Back to labs</span>
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              {/* Brand Accent Switcher */}
              <div
                role="group"
                aria-label="Brand accent preview"
                className="inline-flex items-center rounded-full border border-border bg-surface p-1 shadow-[var(--shadow-card)]"
              >
                {(["niwa", "auth"] as const).map((id) => {
                  const item = brandThemes[id];
                  const active = brand === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setBrand(id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring cursor-pointer ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: active
                            ? "currentColor"
                            : id === "auth"
                              ? "#B85535"
                              : "#6B7F6E",
                        }}
                      />
                      <span>
                        {item.label} ({item.accentName})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 3-State Color Scheme Switcher */}
              <div
                role="group"
                aria-label="Color scheme preference"
                className="inline-flex items-center rounded-full border border-border bg-surface p-1 shadow-[var(--shadow-card)]"
              >
                {(
                  [
                    {
                      id: "system",
                      label: `System (${systemDark ? "Dark" : "Light"})`,
                    },
                    { id: "light", label: "Light" },
                    { id: "dark", label: "Dark" },
                  ] as const
                ).map((option) => {
                  const active = schemePref === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleSelectScheme(option.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring cursor-pointer ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Editorial Masthead */}
          <header className="mb-12 text-center max-w-2xl mx-auto space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
              NIWA / DESIGN SYSTEM
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-[-0.02em] leading-[1.08] text-foreground">
              Calm, tactile tokens for every corner of the garden.
            </h1>
            <p className="text-sm sm:text-[15px] leading-relaxed text-muted-foreground">
              Built in <code className="font-mono text-xs text-foreground">@niwa/ui</code>{" "}
              with <strong className="font-semibold text-foreground">Sage</strong> as the
              Niwa base,{" "}
              <strong className="font-semibold text-foreground">Terracotta</strong> for{" "}
              <code className="font-mono text-xs text-foreground">auth</code>,{" "}
              <span className="font-serif italic text-foreground">Playfair Display</span>{" "}
              headings, and Open Sans UI copy.
            </p>
            <div className="pt-1 flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-muted-foreground">
              <span className="rounded-full border border-border bg-surface px-3 py-1">
                brand: {activeBrand.id} ({activeBrand.accentName})
              </span>
              <span className="rounded-full border border-border bg-surface px-3 py-1">
                theme: {resolvedScheme}
                {schemePref === "system" ? " (auto)" : " (pinned)"}
              </span>
              <span className="rounded-full border border-border bg-surface px-3 py-1">
                import &quot;@niwa/ui/styles/tokens.css&quot;
              </span>
            </div>
          </header>

          {/* CALM / KIT Inspired 2-Column Study Grid */}
          <main className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PaletteSection
              brand={brand}
              copiedKey={copiedKey}
              onCopy={handleCopy}
            />
            <TypographySection />
            <ButtonsSection />
            <SearchInputSection />
            <ControlsSection />
            <ProfileAndEditorialSection />
            <ProgressAndBadgesSection />
            <NotificationSection />
            <SegmentedTabsSection />
            <BottomNavigationSection />
            <SemanticReferenceSection
              brand={brand}
              copiedKey={copiedKey}
              onCopy={handleCopy}
            />
          </main>
        </div>
      </div>
    </>
  );
}
