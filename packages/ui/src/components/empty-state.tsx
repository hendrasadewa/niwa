import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

export interface EmptyStateProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
}

export function EmptyState({
  title,
  description,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-border-strong/60 bg-surface-muted/40 px-6 py-8 text-center",
        className
      )}
      {...props}
    >
      <p className="font-serif text-base font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
