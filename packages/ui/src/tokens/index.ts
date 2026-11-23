export type NiwaBrand = "niwa" | "auth" | "preorder";
export type ColorSchemePreference = "system" | "light" | "dark";
export type ResolvedColorScheme = "light" | "dark";

export interface PaletteSwatch {
  name: string;
  cssVar: string;
  hex: string;
  role: string;
}

export interface SemanticTokenMeta {
  name: string;
  cssVar: string;
  tailwindClass: string;
  lightHex: string;
  darkHex: string;
  authLightHex?: string;
  authDarkHex?: string;
  preorderLightHex?: string;
  preorderDarkHex?: string;
  usage: string;
}

export interface TypographyScaleToken {
  name: string;
  family: "serif" | "sans" | "mono";
  sample: string;
  specs: string;
  className: string;
}

export interface RadiusTokenMeta {
  name: string;
  cssVar: string;
  value: string;
  px: string;
  usage: string;
}

export interface ShadowTokenMeta {
  name: string;
  cssVar: string;
  usage: string;
}

export const COLOR_SCHEME_STORAGE_KEY = "niwa:color-scheme";

/**
 * Core botanical swatches from the Niwa base brand (CALM / KIT).
 */
export const niwaCoreSwatches: readonly PaletteSwatch[] = [
  { name: "Sage", cssVar: "--niwa-sage-500", hex: "#6B7F6E", role: "Signature botanical tone" },
  { name: "Moss", cssVar: "--niwa-sage-300", hex: "#A7B8A7", role: "Secondary botanical accent" },
  { name: "Mist", cssVar: "--niwa-sage-200", hex: "#D9E1D9", role: "Soft tinted fills & notifications" },
  { name: "Ivory", cssVar: "--niwa-ivory", hex: "#F4EFE8", role: "Warm secondary surface" },
  { name: "Sand", cssVar: "--niwa-sand-400", hex: "#C9BDAF", role: "Warm dividers & muted tracks" },
] as const;

/**
 * Editorial terracotta accent swatches for the Auth app (CHAPTER / ONE).
 */
export const authAccentSwatches: readonly PaletteSwatch[] = [
  { name: "Terracotta", cssVar: "--niwa-terracotta-500", hex: "#B85535", role: "Auth signature accent" },
  { name: "Sienna Action", cssVar: "--niwa-terracotta-600", hex: "#AD4D2E", role: "Light primary CTA (5.11:1)" },
  { name: "Clay Light", cssVar: "--niwa-terracotta-300", hex: "#DE8262", role: "Dark primary CTA (6.53:1)" },
  { name: "Blush Wash", cssVar: "--niwa-terracotta-100", hex: "#F4E4DC", role: "Light soft pill & highlight" },
  { name: "Umber Deep", cssVar: "--niwa-terracotta-900", hex: "#33201A", role: "Dark soft surface" },
] as const;

/**
 * Waterlily Pink accent swatches for the Preorder / Open-PO app.
 */
export const preorderAccentSwatches: readonly PaletteSwatch[] = [
  { name: "Waterlily", cssVar: "--niwa-waterlily-500", hex: "#D48C9E", role: "Preorder signature soft pink" },
  { name: "Rose Action", cssVar: "--niwa-waterlily-600", hex: "#A8546C", role: "Light primary CTA (4.77:1)" },
  { name: "Petal Light", cssVar: "--niwa-waterlily-300", hex: "#E5A4B4", role: "Dark primary CTA (8.83:1)" },
  { name: "Blossom Wash", cssVar: "--niwa-waterlily-100", hex: "#F6E6EA", role: "Light soft pill & highlight" },
  { name: "Plum Dusk", cssVar: "--niwa-waterlily-900", hex: "#301E24", role: "Dark soft petal surface" },
] as const;

/**
 * Warm paper (light) and warm botanical charcoal (dark) neutral ramp.
 */
export const neutralSwatches: readonly PaletteSwatch[] = [
  { name: "Paper", cssVar: "--niwa-paper", hex: "#FCFBF8", role: "Light elevated card" },
  { name: "Canvas", cssVar: "--niwa-canvas", hex: "#F7F3EC", role: "Light page background" },
  { name: "Parchment", cssVar: "--niwa-parchment", hex: "#EBE5DA", role: "Light muted chips & tracks" },
  { name: "Stone", cssVar: "--niwa-stone-600", hex: "#5C5852", role: "Light muted body ink" },
  { name: "Ink", cssVar: "--niwa-ink-900", hex: "#1E2420", role: "Light primary ink" },
  { name: "Night Canvas", cssVar: "--niwa-night-950", hex: "#161816", role: "Dark page background" },
  { name: "Night Card", cssVar: "--niwa-night-900", hex: "#1E211E", role: "Dark elevated card" },
  { name: "Night Mist", cssVar: "--niwa-night-50", hex: "#F2EFE9", role: "Dark primary ink" },
] as const;

export const semanticTokens: readonly SemanticTokenMeta[] = [
  {
    name: "Background",
    cssVar: "--background",
    tailwindClass: "bg-background",
    lightHex: "#F7F3EC",
    darkHex: "#161816",
    usage: "Viewport & page canvas",
  },
  {
    name: "Surface",
    cssVar: "--surface",
    tailwindClass: "bg-surface",
    lightHex: "#FCFBF8",
    darkHex: "#1E211E",
    usage: "Elevated cards, sheets, popovers",
  },
  {
    name: "Surface Muted",
    cssVar: "--surface-muted",
    tailwindClass: "bg-surface-muted",
    lightHex: "#F4EFE8",
    darkHex: "#252925",
    usage: "Recessed inputs, secondary panels",
  },
  {
    name: "Foreground",
    cssVar: "--foreground",
    tailwindClass: "text-foreground",
    lightHex: "#1E2420",
    darkHex: "#F2EFE9",
    usage: "Primary headings & body copy",
  },
  {
    name: "Muted Foreground",
    cssVar: "--muted-foreground",
    tailwindClass: "text-muted-foreground",
    lightHex: "#5C5852",
    darkHex: "#ABA69D",
    usage: "Captions, metadata, helper copy",
  },
  {
    name: "Primary",
    cssVar: "--primary",
    tailwindClass: "bg-primary",
    lightHex: "#556B59",
    darkHex: "#92AD96",
    authLightHex: "#AD4D2E",
    authDarkHex: "#DE8262",
    preorderLightHex: "#A8546C",
    preorderDarkHex: "#E5A4B4",
    usage: "Primary CTA, active segment, checked controls",
  },
  {
    name: "Primary Soft",
    cssVar: "--primary-soft",
    tailwindClass: "bg-primary-soft",
    lightHex: "#E3EAE3",
    darkHex: "#212E23",
    authLightHex: "#F4E4DC",
    authDarkHex: "#33201A",
    preorderLightHex: "#F6E6EA",
    preorderDarkHex: "#301E24",
    usage: "Tinted notifications, badges, soft callouts",
  },
  {
    name: "Border",
    cssVar: "--border",
    tailwindClass: "border-border",
    lightHex: "#E5DDD2",
    darkHex: "#2E332E",
    usage: "Card hairlines & section dividers",
  },
  {
    name: "Border Strong",
    cssVar: "--border-strong",
    tailwindClass: "border-border-strong",
    lightHex: "#8B8175",
    darkHex: "#6C716B",
    usage: "Accessible 3:1 control outlines & checkboxes",
  },
] as const;

export const typographyScale: readonly TypographyScaleToken[] = [
  {
    name: "Display Editorial",
    family: "serif",
    sample: "A little more wonder.",
    specs: "Playfair Display · 48px / 1.08 · -0.02em",
    className: "font-serif text-4xl sm:text-5xl font-medium tracking-[-0.02em] leading-[1.08]",
  },
  {
    name: "Page Heading",
    family: "serif",
    sample: "Continue reading",
    specs: "Playfair Display · 30px / 1.18 · -0.015em",
    className: "font-serif text-3xl font-medium tracking-[-0.015em] leading-[1.18]",
  },
  {
    name: "Section Title",
    family: "serif",
    sample: "Calm, purposeful interfaces",
    specs: "Playfair Display · 22px / 1.25 · -0.01em",
    className: "font-serif text-[22px] font-medium tracking-[-0.01em] leading-snug",
  },
  {
    name: "Kicker / Micro-label",
    family: "sans",
    sample: "01. COLOR PALETTE · NIWA / GARDEN",
    specs: "Open Sans · 11px / 1.4 · +0.16em · Uppercase",
    className: "font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground",
  },
  {
    name: "Body Copy",
    family: "sans",
    sample: "A quiet garden of tools crafted for calmer, more deliberate daily workflows across light and dark spaces.",
    specs: "Open Sans · 15px / 1.65 · Regular",
    className: "font-sans text-[15px] leading-[1.65]",
  },
  {
    name: "UI Label / Caption",
    family: "sans",
    sample: "Updated 2 minutes ago · Chapter 12 of 18",
    specs: "Open Sans · 13px / 1.5 · Medium",
    className: "font-sans text-[13px] font-medium text-muted-foreground",
  },
  {
    name: "Token / Code",
    family: "mono",
    sample: "var(--primary) /* #556B59 -> #92AD96 */",
    specs: "Monospace · 12px / 1.5",
    className: "font-mono text-xs",
  },
] as const;

export const radiusTokens: readonly RadiusTokenMeta[] = [
  { name: "xs", cssVar: "--radius-xs", value: "0.25rem", px: "4px", usage: "Micro indicators" },
  { name: "sm", cssVar: "--radius-sm", value: "0.375rem", px: "6px", usage: "Checkboxes, inline tags" },
  { name: "md", cssVar: "--radius-md", value: "0.75rem", px: "12px", usage: "Book covers, compact tiles" },
  { name: "lg", cssVar: "--radius-lg", value: "1rem", px: "16px", usage: "Alerts, toast notifications" },
  { name: "xl", cssVar: "--radius-xl", value: "1.25rem", px: "20px", usage: "Standard content cards" },
  { name: "2xl", cssVar: "--radius-2xl", value: "1.5rem", px: "24px", usage: "Showcase sheets, floating bars" },
  { name: "pill", cssVar: "--radius-pill", value: "9999px", px: "Full", usage: "Buttons, chips, search, toggles" },
] as const;

export const shadowTokens: readonly ShadowTokenMeta[] = [
  { name: "Card", cssVar: "--shadow-card", usage: "Default resting paper elevation" },
  { name: "Elevated", cssVar: "--shadow-elevated", usage: "Floating panels, active sheets, popovers" },
  { name: "Inset", cssVar: "--shadow-inset", usage: "Recessed search bars & progress tracks" },
] as const;

export const brandThemes: Record<
  NiwaBrand,
  {
    id: NiwaBrand;
    label: string;
    subtitle: string;
    accentName: string;
    dataBrandAttr: string | undefined;
    primaryLight: string;
    primaryDark: string;
  }
> = {
  niwa: {
    id: "niwa",
    label: "Niwa Base",
    subtitle: "Default across web, labs, pustaka, open-po",
    accentName: "Sage",
    dataBrandAttr: undefined,
    primaryLight: "#556B59",
    primaryDark: "#92AD96",
  },
  auth: {
    id: "auth",
    label: "Auth Accent",
    subtitle: 'Per-app override via data-brand="auth"',
    accentName: "Terracotta",
    dataBrandAttr: "auth",
    primaryLight: "#AD4D2E",
    primaryDark: "#DE8262",
  },
  preorder: {
    id: "preorder",
    label: "Preorder",
    subtitle: 'Per-app override via data-brand="preorder"',
    accentName: "Waterlily Pink",
    dataBrandAttr: "preorder",
    primaryLight: "#A8546C",
    primaryDark: "#E5A4B4",
  },
};

/**
 * Reads stored color-scheme preference safely (defaults to "system").
 */
export function getStoredColorScheme(): ColorSchemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    // Ignore storage access errors (e.g. restricted storage environments)
  }
  return "system";
}

/**
 * Resolves the effective color scheme given a preference and OS setting.
 */
export function resolveColorScheme(
  preference: ColorSchemePreference,
  systemPrefersDark: boolean
): ResolvedColorScheme {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return preference;
}

/**
 * Syncs the document's <meta name="color-scheme">, root attributes, and localStorage.
 */
export function applyColorScheme(preference: ColorSchemePreference): void {
  if (typeof document === "undefined") return;

  const metaContent = preference === "system" ? "light dark" : preference;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "color-scheme";
    document.head.appendChild(meta);
  }
  meta.content = metaContent;

  const root = document.documentElement;
  if (preference === "system") {
    root.removeAttribute("data-theme");
    root.classList.remove("dark", "light");
  } else {
    root.setAttribute("data-theme", preference);
    root.classList.toggle("dark", preference === "dark");
    root.classList.toggle("light", preference === "light");
  }

  try {
    if (preference === "system") {
      window.localStorage.removeItem(COLOR_SCHEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, preference);
    }
  } catch {
    // Theme still applies even if storage cannot persist
  }
}
