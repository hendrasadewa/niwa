import type { ButtonHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "xs" | "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-600 font-semibold text-white hover:bg-emerald-500 border border-transparent",
  secondary:
    "border border-neutral-800 bg-neutral-900 font-medium text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100",
  ghost:
    "border border-transparent bg-transparent font-medium text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-100",
  danger:
    "border border-red-900/50 bg-red-950/40 font-medium text-red-300 hover:bg-red-900/40",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "rounded px-1.5 py-0.5 text-[10px]",
  sm: "rounded-md px-2.5 py-1 text-xs",
  md: "rounded-md px-3.5 py-1.5 text-xs",
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
        "inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}
