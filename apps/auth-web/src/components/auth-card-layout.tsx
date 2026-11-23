import type { ReactNode } from "react";
import { Card } from "@niwa/ui/components";

export function AuthCardLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-primary-soft font-serif text-lg font-semibold text-primary-soft-foreground shadow-[var(--shadow-card)]">
            N
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            NIWA / IDENTITY
          </p>
          <h1 className="mt-2 font-serif text-3xl font-medium tracking-[-0.02em] text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        <Card className="shadow-[var(--shadow-elevated)]">{children}</Card>

        {footer && (
          <div className="text-center text-xs text-muted-foreground">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
