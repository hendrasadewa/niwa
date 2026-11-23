import type { HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type AlertVariant = "error" | "info" | "warning" | "success";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

const variantClasses: Record<AlertVariant, string> = {
  error: "border-danger-border bg-danger-soft text-danger-foreground",
  info: "border-info-border bg-info-soft text-info-foreground",
  warning: "border-warning-border bg-warning-soft text-warning-foreground",
  success: "border-success-border bg-success-soft text-success-foreground",
};

const iconBgClasses: Record<AlertVariant, string> = {
  error: "bg-danger text-primary-foreground",
  info: "bg-info text-primary-foreground",
  warning: "bg-warning text-primary-foreground",
  success: "bg-success text-primary-foreground",
};

const variantIcons: Record<AlertVariant, string> = {
  error: "!",
  info: "i",
  warning: "!",
  success: "✓",
};

export function Alert({
  variant = "info",
  role,
  className,
  children,
  ...props
}: AlertProps) {
  const resolvedRole =
    role ?? (variant === "error" || variant === "warning" ? "alert" : "status");

  return (
    <div
      role={resolvedRole}
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-3 text-xs leading-relaxed shadow-[var(--shadow-card)]",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold leading-none",
          iconBgClasses[variant]
        )}
      >
        {variantIcons[variant]}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
