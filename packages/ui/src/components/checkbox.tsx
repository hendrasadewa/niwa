import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  description?: ReactNode;
  card?: boolean;
  monoLabel?: boolean;
}

export function Checkbox({
  label,
  description,
  card = false,
  monoLabel = false,
  checked,
  disabled,
  className,
  ...props
}: CheckboxProps) {
  if (!label && !description) {
    return (
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        className={cn("niwa-checkbox", className)}
        {...props}
      />
    );
  }

  return (
    <label
      className={cn(
        "flex min-h-11 items-start gap-3 text-xs transition-colors select-none",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        card &&
          "rounded-[var(--radius-lg)] border p-3.5",
        card &&
          (checked
            ? "border-primary/50 bg-primary-soft/75"
            : "border-border bg-surface-muted/60 hover:border-border-strong/80"),
        className
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        className="niwa-checkbox mt-0.5"
        {...props}
      />
      <span className="min-w-0 flex-1 space-y-0.5">
        {label && (
          <span
            className={cn(
              "block font-medium text-foreground",
              monoLabel && "font-mono"
            )}
          >
            {label}
          </span>
        )}
        {description && (
          <span className="block text-[11px] leading-relaxed text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
