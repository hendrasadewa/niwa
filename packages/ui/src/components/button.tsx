import type { ButtonHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-primary font-semibold text-primary-foreground shadow-[var(--shadow-card)] hover:bg-primary-hover",
  secondary:
    "border border-border-strong/80 bg-surface font-medium text-foreground shadow-[var(--shadow-card)] hover:bg-surface-muted",
  soft:
    "border border-transparent bg-primary-soft font-medium text-primary-soft-foreground hover:opacity-90",
  ghost:
    "border border-transparent bg-transparent font-medium text-muted-foreground hover:bg-surface-subtle/75 hover:text-foreground",
  danger:
    "border border-danger-border bg-danger-soft font-medium text-danger-foreground hover:opacity-90",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "rounded-full px-2.5 py-1 text-[11px]",
  sm: "rounded-full px-3.5 py-1.5 text-xs",
  md: "rounded-full px-5 py-2 text-sm",
  lg: "rounded-full px-6 py-2.5 text-sm",
};

export function Button({
  variant = "secondary",
  size = "sm",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}
