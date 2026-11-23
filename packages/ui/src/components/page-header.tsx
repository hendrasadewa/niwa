import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export interface PageHeaderProps {
  kicker?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-4",
        className
      )}
    >
      <div className="space-y-1">
        {kicker && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {kicker}
          </p>
        )}
        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-[-0.015em] text-foreground">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-xs sm:text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
