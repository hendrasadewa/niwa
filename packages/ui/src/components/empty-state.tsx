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
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-800/80 p-6 text-center",
        className
      )}
      {...props}
    >
      <p className="text-xs text-neutral-400">{title}</p>
      {description && (
        <p className="text-[11px] text-neutral-500 mt-1">{description}</p>
      )}
    </div>
  );
}
