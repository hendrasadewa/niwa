import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Divider,
  FormField,
  PasswordInput,
  SelectInput,
  Spinner,
  Switch,
  TextArea,
  TextInput,
} from "@niwa/ui/components";
import {
  authAccentSwatches,
  neutralSwatches,
  niwaCoreSwatches,
  preorderAccentSwatches,
  radiusTokens,
  semanticTokens,
  shadowTokens,
  typographyScale,
  type NiwaBrand,
  type PaletteSwatch,
} from "@niwa/ui/tokens";

export function StudyCard({
  index,
  title,
  children,
  className = "",
}: {
  index: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[var(--radius-2xl)] border border-border bg-surface p-6 sm:p-7 shadow-[var(--shadow-card)] transition-colors ${className}`}
    >
      <header className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {index}. {title}
        </h2>
      </header>
      {children}
    </section>
  );
}

function SwatchCircle({
  swatch,
  copiedKey,
  onCopy,
}: {
  swatch: PaletteSwatch;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
}) {
  const isCopied = copiedKey === swatch.cssVar;
  return (
    <button
      type="button"
      onClick={() => onCopy(swatch.cssVar, `var(${swatch.cssVar})`)}
      title={`Copy var(${swatch.cssVar}) · ${swatch.role}`}
      className="group flex flex-col items-center gap-2 text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring rounded-xl cursor-pointer"
    >
      <span
        className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border border-border shadow-[var(--shadow-card)] transition-transform duration-150 group-hover:scale-105"
        style={{ backgroundColor: `var(${swatch.cssVar})` }}
      />
      <span className="flex flex-col items-center leading-tight">
        <span className="text-xs font-semibold text-foreground">{swatch.name}</span>
        <span className="font-mono text-[10px] text-muted-foreground mt-0.5">
          {isCopied ? "Copied!" : swatch.hex}
        </span>
      </span>
    </button>
  );
}

export function PaletteSection({
  brand,
  copiedKey,
  onCopy,
}: {
  brand: NiwaBrand;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
}) {
  return (
    <StudyCard index="01" title="Color Palette">
      <div className="space-y-6">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              Niwa Core — Botanical Sage
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              Click swatch to copy CSS var
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {niwaCoreSwatches.map((swatch) => (
              <SwatchCircle
                key={swatch.cssVar}
                swatch={swatch}
                copiedKey={copiedKey}
                onCopy={onCopy}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              Auth Per-App Accent — Terracotta
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium ${
                brand === "auth"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-subtle text-muted-foreground"
              }`}
            >
              data-brand=&quot;auth&quot;
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {authAccentSwatches.map((swatch) => (
              <SwatchCircle
                key={swatch.cssVar}
                swatch={swatch}
                copiedKey={copiedKey}
                onCopy={onCopy}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              Preorder Per-App Accent — Waterlily Pink
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium ${
                brand === "preorder"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-subtle text-muted-foreground"
              }`}
            >
              data-brand=&quot;preorder&quot;
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {preorderAccentSwatches.map((swatch) => (
              <SwatchCircle
                key={swatch.cssVar}
                swatch={swatch}
                copiedKey={copiedKey}
                onCopy={onCopy}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <div className="mb-3 text-xs font-medium text-foreground">
            Warm Paper &amp; Botanical Night Neutrals
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {neutralSwatches.map((swatch) => {
              const isCopied = copiedKey === swatch.cssVar;
              return (
                <button
                  key={swatch.cssVar}
                  type="button"
                  onClick={() => onCopy(swatch.cssVar, `var(${swatch.cssVar})`)}
                  title={`${swatch.name} (${swatch.hex}) · ${swatch.role}`}
                  className="group flex flex-col items-start gap-1.5 rounded-lg p-1 text-left focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
                >
                  <span
                    className="h-8 w-full rounded-md border border-border transition-transform duration-150 group-hover:scale-[1.03]"
                    style={{ backgroundColor: `var(${swatch.cssVar})` }}
                  />
                  <span className="text-[11px] font-medium text-foreground truncate w-full">
                    {swatch.name}
                  </span>
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {isCopied ? "Copied!" : swatch.hex}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </StudyCard>
  );
}

export function TypographySection() {
  return (
    <StudyCard index="02" title="Typography">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-[var(--radius-xl)] border border-border bg-surface-muted/70 p-4 flex items-center justify-between gap-4">
            <div className="font-serif text-6xl font-medium tracking-[-0.03em] text-foreground leading-none">
              Aa
            </div>
            <div className="space-y-1 text-right">
              <div className="font-serif text-base font-semibold text-foreground">
                Playfair Display
              </div>
              <div className="font-serif text-xs font-normal text-muted-foreground">
                Regular · 400
              </div>
              <div className="font-serif text-xs font-medium text-foreground">
                Medium · 500
              </div>
              <div className="font-serif text-xs font-semibold text-foreground">
                Semibold · 600
              </div>
              <div className="font-serif text-xs italic text-muted-foreground">
                Italic · Editorial
              </div>
            </div>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-border bg-surface-muted/70 p-4 flex items-center justify-between gap-4">
            <div className="font-sans text-6xl font-normal tracking-[-0.03em] text-foreground leading-none">
              Aa
            </div>
            <div className="space-y-1 text-right">
              <div className="font-sans text-base font-semibold text-foreground">
                Open Sans
              </div>
              <div className="font-sans text-xs font-light text-muted-foreground">
                Light · 300
              </div>
              <div className="font-sans text-xs font-normal text-muted-foreground">
                Regular · 400
              </div>
              <div className="font-sans text-xs font-medium text-foreground">
                Medium · 500
              </div>
              <div className="font-sans text-xs font-semibold text-foreground">
                Semibold · 600
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border">
          {typographyScale.map((item) => (
            <div key={item.name} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {item.name}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {item.specs}
                </span>
              </div>
              <p className={`text-foreground ${item.className}`}>{item.sample}</p>
            </div>
          ))}
        </div>
      </div>
    </StudyCard>
  );
}

export function ButtonsSection() {
  const filters = ["All", "Reading", "To Read", "Finished"] as const;
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All");

  return (
    <StudyCard index="03" title="Buttons & Filter Chips">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer"
          >
            <span>Primary</span>
            <span aria-hidden="true">→</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer"
          >
            Secondary
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-5 py-2.5 text-sm font-medium text-primary-soft-foreground transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer"
          >
            Soft Tint
          </button>

          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground opacity-45 cursor-not-allowed"
          >
            Disabled
          </button>
        </div>

        <div className="border-t border-border pt-4">
          <div className="mb-2.5 text-xs font-medium text-muted-foreground">
            Editorial Filter Chips
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Reading status filter">
            {filters.map((filter) => {
              const active = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-subtle text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </StudyCard>
  );
}

export function SearchInputSection() {
  const [query, setQuery] = useState("");

  return (
    <StudyCard index="04" title="Search & Inputs">
      <div className="space-y-4">
        <div className="flex items-center rounded-full border border-border-strong/70 bg-surface-muted px-4 py-2.5 shadow-[var(--shadow-inset)] focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30 transition">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tokens, books, or notes..."
            aria-label="Search tokens, books, or notes"
            className="ml-3 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <span className="mx-3 h-4 w-px bg-border" aria-hidden="true" />
          <button
            type="button"
            aria-label="Filter options"
            className="rounded-full p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            >
              <line x1="4" y1="7" x2="20" y2="7" />
              <circle cx="9" cy="7" r="2" fill="currentColor" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <circle cx="15" cy="12" r="2" fill="currentColor" />
              <line x1="4" y1="17" x2="20" y2="17" />
              <circle cx="11" cy="17" r="2" fill="currentColor" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Uses <code className="font-mono text-foreground">--surface-muted</code>,{" "}
            <code className="font-mono text-foreground">--radius-pill</code>, and{" "}
            <code className="font-mono text-foreground">--ring</code>.
          </span>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-primary underline underline-offset-2 cursor-pointer"
            >
              Clear &ldquo;{query}&rdquo;
            </button>
          )}
        </div>
      </div>
    </StudyCard>
  );
}

export function ControlsSection() {
  const [toggleA, setToggleA] = useState(true);
  const [toggleB, setToggleB] = useState(false);
  const [checkedA, setCheckedA] = useState(true);
  const [checkedB, setCheckedB] = useState(false);
  const indeterminateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (indeterminateRef.current) {
      indeterminateRef.current.indeterminate = checkedA !== checkedB;
    }
  }, [checkedA, checkedB]);

  return (
    <StudyCard index="05" title="Toggles & Checkboxes">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-1">
          <label className="flex min-h-11 items-center gap-3.5 cursor-pointer select-none">
            <input
              type="checkbox"
              role="switch"
              checked={toggleA}
              onChange={(e) => setToggleA(e.target.checked)}
              className="niwa-switch"
            />
            <span className="text-sm text-foreground">
              {toggleA ? "Toggle On" : "Toggle Off"}
            </span>
          </label>
          <label className="flex min-h-11 items-center gap-3.5 cursor-pointer select-none">
            <input
              type="checkbox"
              role="switch"
              checked={toggleB}
              onChange={(e) => setToggleB(e.target.checked)}
              className="niwa-switch"
            />
            <span className="text-sm text-muted-foreground">
              {toggleB ? "Digest Enabled" : "Digest Muted"}
            </span>
          </label>
        </div>

        <div className="space-y-1 sm:border-l sm:border-border sm:pl-6">
          <label className="flex min-h-11 items-center gap-3 cursor-pointer select-none">
            <input
              ref={indeterminateRef}
              type="checkbox"
              checked={checkedA && checkedB}
              onChange={(e) => {
                setCheckedA(e.target.checked);
                setCheckedB(e.target.checked);
              }}
              className="niwa-checkbox"
            />
            <span className="text-sm font-medium text-foreground">
              Select all (indeterminate)
            </span>
          </label>
          <label className="flex min-h-11 items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checkedA}
              onChange={(e) => setCheckedA(e.target.checked)}
              className="niwa-checkbox"
            />
            <span className="text-sm text-foreground">Checked</span>
          </label>
          <label className="flex min-h-11 items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checkedB}
              onChange={(e) => setCheckedB(e.target.checked)}
              className="niwa-checkbox"
            />
            <span className="text-sm text-muted-foreground">Unchecked</span>
          </label>
        </div>
      </div>
    </StudyCard>
  );
}

export function ProfileAndEditorialSection() {
  return (
    <StudyCard index="06" title="Profile & Editorial Cards">
      <div className="space-y-4">
        {/* CALM / KIT Profile Card */}
        <div className="flex items-center justify-between gap-4 rounded-[var(--radius-xl)] border border-border bg-surface-muted/50 p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative h-12 w-12 shrink-0 rounded-full bg-primary-soft border border-border flex items-center justify-center font-serif text-lg font-semibold text-primary-soft-foreground">
              HS
              <span
                aria-label="Online"
                className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary ring-2 ring-surface"
              />
            </div>
            <div className="min-w-0">
              <div className="font-serif text-base font-semibold text-foreground truncate">
                Hendra Sadewa
              </div>
              <div className="text-xs text-muted-foreground truncate">
                Product Engineer · Niwa Garden
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Profile options"
            className="h-9 w-9 shrink-0 rounded-full border border-border bg-surface text-muted-foreground hover:text-foreground flex items-center justify-center focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
          >
            •••
          </button>
        </div>

        {/* CHAPTER / ONE Editorial Mini Card */}
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 flex items-center gap-4">
          <div
            aria-hidden="true"
            className="h-16 w-14 shrink-0 rounded-[var(--radius-md)] border border-border bg-primary-soft flex flex-col items-center justify-center p-1.5 text-center"
          >
            <span className="font-serif text-[10px] leading-tight font-semibold text-primary-soft-foreground">
              The Quiet Sea
            </span>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-serif text-base font-medium text-foreground truncate">
                The Quiet Sea
              </h3>
              <span className="font-serif text-sm text-foreground">68%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-track">
              <div className="h-full w-[68%] rounded-full bg-primary" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Chapter 12 of 18 · About 2 hours left
            </p>
          </div>
        </div>
      </div>
    </StudyCard>
  );
}

export function ProgressAndBadgesSection() {
  const [progress, setProgress] = useState(72);

  return (
    <StudyCard index="07" title="Progress Bar & Semantic Badges">
      <div className="space-y-5">
        <div className="space-y-2.5">
          <div className="flex items-center gap-4">
            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Completion progress"
              className="h-3.5 flex-1 overflow-hidden rounded-full bg-track shadow-[var(--shadow-inset)]"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="w-10 text-right text-sm font-semibold tabular-nums text-foreground">
              {progress}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="niwa-progress-range" className="text-xs text-muted-foreground">
              Adjust live progress
            </label>
            <input
              id="niwa-progress-range"
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-40 cursor-pointer"
            />
          </div>
        </div>

        <div className="border-t border-border pt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success-border bg-success-soft px-3 py-1 text-xs font-medium text-success-foreground">
            <span aria-hidden="true">✓</span> Success
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-border bg-warning-soft px-3 py-1 text-xs font-medium text-warning-foreground">
            <span aria-hidden="true">!</span> Warning
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-danger-border bg-danger-soft px-3 py-1 text-xs font-medium text-danger-foreground">
            <span aria-hidden="true">×</span> Danger
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-info-border bg-info-soft px-3 py-1 text-xs font-medium text-info-foreground">
            <span aria-hidden="true">i</span> Info
          </span>
        </div>
      </div>
    </StudyCard>
  );
}

export function NotificationSection() {
  const [dismissed, setDismissed] = useState(false);

  return (
    <StudyCard index="08" title="Notification">
      <div className="space-y-3">
        {!dismissed ? (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-primary-soft px-4 py-3.5 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
              >
                ✓
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-primary-soft-foreground">
                  All set!
                </div>
                <p className="text-xs text-primary-soft-foreground/85 truncate">
                  Your design token preferences have been saved.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss notification"
              className="rounded-full p-1.5 text-primary-soft-foreground/75 hover:text-primary-soft-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setDismissed(false)}
            className="rounded-full border border-border-strong bg-surface px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-muted cursor-pointer"
          >
            Restore notification
          </button>
        )}

        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-danger-border bg-danger-soft px-4 py-3 text-xs text-danger-foreground"
        >
          <span aria-hidden="true" className="font-bold">
            ⚠
          </span>
          <span>
            Session token expired. Sign in again to continue syncing workspace changes.
          </span>
        </div>
      </div>
    </StudyCard>
  );
}

export function SegmentedTabsSection() {
  const tabs = [
    { id: "home", label: "Home", icon: "⌂" },
    { id: "projects", label: "Projects", icon: "⊞" },
    { id: "profile", label: "Profile", icon: "○" },
  ] as const;
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("home");

  return (
    <StudyCard index="09" title="Segmented Tabs">
      <div
        role="tablist"
        aria-label="Workspace sections"
        className="grid grid-cols-3 overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface-muted/60 shadow-[var(--shadow-card)]"
      >
        {tabs.map((tab, idx) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 py-3.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring cursor-pointer ${
                idx > 0 ? "border-l border-border" : ""
              } ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface"
              }`}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </StudyCard>
  );
}

export function BottomNavigationSection() {
  const items = [
    { id: "home", label: "Home", icon: "⌂" },
    { id: "search", label: "Search", icon: "⌕" },
    { id: "favorites", label: "Favorites", icon: "♡" },
    { id: "settings", label: "Settings", icon: "⚙" },
  ] as const;
  const [active, setActive] = useState<(typeof items)[number]["id"]>("home");

  return (
    <StudyCard index="10" title="Bottom Navigation">
      <nav
        aria-label="Mobile navigation preview"
        className="grid grid-cols-4 rounded-[var(--radius-2xl)] border border-border bg-surface-muted/70 px-2 py-2.5 shadow-[var(--shadow-elevated)]"
      >
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => setActive(item.id)}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring cursor-pointer ${
                isActive
                  ? "font-semibold text-primary"
                  : "font-normal text-muted-foreground hover:text-foreground"
              }`}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                {item.icon}
              </span>
              <span>{item.label}</span>
              <span
                aria-hidden="true"
                className={`h-1 w-1 rounded-full transition-opacity ${
                  isActive ? "bg-primary opacity-100" : "opacity-0"
                }`}
              />
            </button>
          );
        })}
      </nav>
    </StudyCard>
  );
}

export function SemanticReferenceSection({
  brand,
  copiedKey,
  onCopy,
}: {
  brand: NiwaBrand;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
}) {
  return (
    <StudyCard index="11" title="Semantic Tokens, Radii & Elevation" className="lg:col-span-2">
      <div className="space-y-8">
        {/* Semantic token table */}
        <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-border">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-muted/70 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Token</th>
                <th className="px-4 py-3 font-semibold">Live</th>
                <th className="px-4 py-3 font-semibold">Tailwind v4</th>
                <th className="px-4 py-3 font-semibold">Light / Dark</th>
                <th className="px-4 py-3 font-semibold">Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {semanticTokens.map((token) => {
                const lightVal =
                  brand === "auth" && token.authLightHex
                    ? token.authLightHex
                    : brand === "preorder" && token.preorderLightHex
                      ? token.preorderLightHex
                      : token.lightHex;
                const darkVal =
                  brand === "auth" && token.authDarkHex
                    ? token.authDarkHex
                    : brand === "preorder" && token.preorderDarkHex
                      ? token.preorderDarkHex
                      : token.darkHex;
                const isCopied = copiedKey === `sem-${token.cssVar}`;
                return (
                  <tr key={token.cssVar} className="hover:bg-surface-muted/40">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onCopy(`sem-${token.cssVar}`, `var(${token.cssVar})`)}
                        className="font-mono font-medium text-foreground hover:text-primary cursor-pointer"
                      >
                        {isCopied ? "Copied!" : token.cssVar}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block h-6 w-10 rounded-md border border-border"
                        style={{ backgroundColor: `var(${token.cssVar})` }}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {token.tailwindClass}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                      {lightVal} / {darkVal}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{token.usage}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Radii & Shadows */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Border Radii
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {radiusTokens.map((r) => (
                <div
                  key={r.name}
                  className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-border bg-surface-muted/50 p-3 text-center"
                >
                  <div
                    className="h-10 w-14 border-2 border-primary bg-primary-soft"
                    style={{ borderRadius: `var(${r.cssVar})` }}
                  />
                  <div className="font-mono text-[11px] font-semibold text-foreground">
                    {r.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{r.px}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Elevation Shadows
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {shadowTokens.map((s) => (
                <div
                  key={s.name}
                  className="flex flex-col justify-between gap-3 rounded-[var(--radius-xl)] border border-border bg-surface p-4"
                  style={{ boxShadow: `var(${s.cssVar})` }}
                >
                  <div className="font-serif text-base font-medium text-foreground">
                    {s.name}
                  </div>
                  <div className="space-y-1">
                    <div className="font-mono text-[10px] text-primary">{s.cssVar}</div>
                    <p className="text-[11px] text-muted-foreground">{s.usage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side-by-side Brand x Mode Scoped Preview */}
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Scoped Theme Matrix (Niwa Sage · Auth Terracotta · Preorder Waterlily × Light / Dark)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(
              [
                { label: "Niwa · Light", theme: "light", brandAttr: undefined },
                { label: "Auth · Light", theme: "light", brandAttr: "auth" },
                { label: "Preorder · Light", theme: "light", brandAttr: "preorder" },
                { label: "Niwa · Dark", theme: "dark", brandAttr: undefined },
                { label: "Auth · Dark", theme: "dark", brandAttr: "auth" },
                { label: "Preorder · Dark", theme: "dark", brandAttr: "preorder" },
              ] as const
            ).map((cell) => (
              <div
                key={cell.label}
                data-theme={cell.theme}
                data-brand={cell.brandAttr}
                className="rounded-[var(--radius-xl)] border border-border bg-background p-4 text-foreground space-y-3"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {cell.label}
                </div>
                <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-3 space-y-2.5 shadow-[var(--shadow-card)]">
                  <div className="font-serif text-sm font-medium text-foreground">
                    Welcome back
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-track overflow-hidden">
                    <div className="h-full w-2/3 rounded-full bg-primary" />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[10px] font-medium text-primary-soft-foreground">
                      Active
                    </span>
                    <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground">
                      Continue →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StudyCard>
  );
}

export function SharedComponentsSection() {
  const [role, setRole] = useState("member");
  const [consent, setConsent] = useState(true);
  const [passkeysOnly, setPasskeysOnly] = useState(false);

  return (
    <StudyCard index="12" title="@niwa/ui Shared Components" className="lg:col-span-2">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <FormField
            label="Email address"
            htmlFor="showcase-email"
            hint="FormField + TextInput"
            required
          >
            <TextInput
              id="showcase-email"
              type="email"
              placeholder="you@hendrasadewa.com"
            />
          </FormField>

          <FormField
            label="Password"
            htmlFor="showcase-password"
            hint="PasswordInput with unmask toggle"
            required
          >
            <PasswordInput
              id="showcase-password"
              defaultValue="niwa-garden-2026"
            />
          </FormField>

          <FormField label="Default role" htmlFor="showcase-role">
            <SelectInput
              id="showcase-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="member">Member (default)</option>
              <option value="editor">Editor</option>
              <option value="admin">Administrator</option>
            </SelectInput>
          </FormField>

          <FormField label="Allowed origins" htmlFor="showcase-origins" hint="TextArea (mono)">
            <TextArea
              id="showcase-origins"
              mono
              defaultValue={"https://hendrasadewa.com\nhttps://auth.hendrasadewa.com"}
            />
          </FormField>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="md">Primary</Button>
            <Button variant="secondary" size="md">Secondary</Button>
            <Button variant="soft" size="md">Soft</Button>
            <Button variant="ghost" size="md">Ghost</Button>
            <Button variant="danger" size="md">Danger</Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary" dot>Primary</Badge>
            <Badge variant="success" dot>Active</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="danger">Revoked</Badge>
            <Badge variant="info" mono>auth-web</Badge>
            <Badge variant="neutral" mono>v1</Badge>
            <Spinner size="sm" />
          </div>

          <Divider label="controls" />

          <Checkbox
            card
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            label="Require explicit first-time consent"
            description="Built with @niwa/ui Checkbox (card mode)."
          />

          <Switch
            checked={passkeysOnly}
            onChange={(e) => setPasskeysOnly(e.target.checked)}
            label="Prefer passkey sign-in"
            description="Built with @niwa/ui Switch."
          />

          <div className="space-y-2.5">
            <Alert variant="success">Profile and passkey settings synchronized.</Alert>
            <Alert variant="error">Invalid credentials. Check your email and password.</Alert>
          </div>
        </div>
      </div>
    </StudyCard>
  );
}
