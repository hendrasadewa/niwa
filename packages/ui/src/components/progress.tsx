import type { HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number | null;
  max?: number;
}

export function Progress({
  value = 0,
  max = 100,
  className,
  ...props
}: ProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.min(safeMax, Math.max(0, value ?? 0));
  const percentage = Math.round((clamped / safeMax) * 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      className={cn(
        "relative h-2.5 w-full overflow-hidden rounded-full bg-track shadow-[var(--shadow-inset)]",
        className
      )}
      {...props}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
