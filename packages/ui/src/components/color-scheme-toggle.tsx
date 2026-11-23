"use client";

import { useCallback, useEffect, useState } from "react";
import {
  COLOR_SCHEME_STORAGE_KEY,
  applyColorScheme,
  getStoredColorScheme,
  type ColorSchemePreference,
} from "../tokens";
import { cn } from "../utils/cn";

export interface ColorSchemeToggleProps {
  className?: string;
  label?: string;
}

export function ColorSchemeToggle({
  className,
  label = "Color scheme preference",
}: ColorSchemeToggleProps) {
  const [preference, setPreference] = useState<ColorSchemePreference>(() =>
    getStoredColorScheme()
  );
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) =>
      setSystemDark(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== COLOR_SCHEME_STORAGE_KEY) return;
      const next = getStoredColorScheme();
      setPreference(next);
      applyColorScheme(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleSelect = useCallback((next: ColorSchemePreference) => {
    setPreference(next);
    applyColorScheme(next);
  }, []);

  const options: readonly { id: ColorSchemePreference; text: string }[] = [
    { id: "system", text: `System (${systemDark ? "Dark" : "Light"})` },
    { id: "light", text: "Light" },
    { id: "dark", text: "Dark" },
  ];

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-surface p-1 shadow-[var(--shadow-card)]",
        className
      )}
    >
      {options.map((option) => {
        const active = preference === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => handleSelect(option.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring cursor-pointer",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.text}
          </button>
        );
      })}
    </div>
  );
}
