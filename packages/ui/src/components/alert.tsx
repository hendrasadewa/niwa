import type { HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type AlertVariant = "error" | "info" | "warning" | "success";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

const variantClasses: Record<AlertVariant, string> = {
  error:
    "border-red-900/80 bg-red-950/40 text-red-300 font-mono whitespace-pre-wrap",
  info: "border-neutral-800 bg-neutral-900/40 text-neutral-300",
  warning: "border-amber-900/80 bg-amber-950/40 text-amber-300",
  success: "border-emerald-900/80 bg-emerald-950/40 text-emerald-300",
};

export function Alert({
  variant = "info",
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border p-3 text-xs",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
