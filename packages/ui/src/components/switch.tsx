import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role"> {
  label?: ReactNode;
  description?: ReactNode;
}

export function Switch({
  label,
  description,
  disabled,
  className,
  ...props
}: SwitchProps) {
  if (!label && !description) {
    return (
      <input
        type="checkbox"
        role="switch"
        disabled={disabled}
        className={cn("niwa-switch", className)}
        {...props}
      />
    );
  }

  return (
    <label
      className={cn(
        "flex min-h-11 items-center gap-3.5 text-sm select-none",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className
      )}
    >
      <input
        type="checkbox"
        role="switch"
        disabled={disabled}
        className="niwa-switch"
        {...props}
      />
      <span className="min-w-0 flex-1 space-y-0.5">
        {label && (
          <span className="block font-medium text-foreground">{label}</span>
        )}
        {description && (
          <span className="block text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
