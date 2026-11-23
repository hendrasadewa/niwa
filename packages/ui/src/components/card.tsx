import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: CardProps) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-2xl)] border border-border bg-surface shadow-[var(--shadow-card)]",
        className
      )}
    >
      {(title || description || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-6 py-4">
          <div className="space-y-0.5">
            {title && (
              <h2 className="font-serif text-lg font-medium tracking-[-0.01em] text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-6", contentClassName)}>{children}</div>
    </section>
  );
}
