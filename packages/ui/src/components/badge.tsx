import type { HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type BadgeVariant =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  mono?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "border border-border bg-surface-subtle text-muted-foreground",
  primary: "border border-border bg-primary-soft text-primary-soft-foreground",
  success: "border border-success-border bg-success-soft text-success-foreground",
  warning: "border border-warning-border bg-warning-soft text-warning-foreground",
  danger: "border border-danger-border bg-danger-soft text-danger-foreground",
  info: "border border-info-border bg-info-soft text-info-foreground",
};

const dotClasses: Record<BadgeVariant, string> = {
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
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
        <span
          aria-hidden="true"
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClasses[variant])}
        />
      )}
      {children}
    </span>
  );
}
