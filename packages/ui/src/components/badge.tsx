import type { HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  mono?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-neutral-800 text-neutral-300",
  success:
    "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60",
  warning: "bg-amber-950/80 text-amber-300 border border-amber-800/60",
  danger: "bg-red-950/80 text-red-300 border border-red-800/60",
  info: "bg-sky-950/80 text-sky-300 border border-sky-800/60",
};

const dotClasses: Record<BadgeVariant, string> = {
  neutral: "bg-neutral-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-red-400",
  info: "bg-sky-400",
};

export function Badge({
  variant = "neutral",
  dot = false,
  mono = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        mono && "font-mono",
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", dotClasses[variant])} />
      )}
      {children}
    </span>
  );
}
