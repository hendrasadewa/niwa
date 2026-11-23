"use client";

import { useState, type InputHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const baseControlClasses =
  "w-full min-h-11 rounded-[var(--radius-md)] border border-border-strong/70 bg-surface-muted px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/80 shadow-[var(--shadow-inset)] transition-colors focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60";

export function TextInput({
  className,
  invalid,
  "aria-invalid": ariaInvalid,
  ...props
}: TextInputProps) {
  const isInvalid = invalid || ariaInvalid === true || ariaInvalid === "true";

  return (
    <input
      aria-invalid={isInvalid ? true : undefined}
      className={cn(
        baseControlClasses,
        isInvalid && "border-danger focus-visible:border-danger",
        className
      )}
      {...props}
    />
  );
}

export interface PasswordInputProps
  extends Omit<TextInputProps, "type"> {
  showLabel?: string;
  hideLabel?: string;
}

export function PasswordInput({
  className,
  disabled,
  showLabel = "Show password",
  hideLabel = "Hide password",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <TextInput
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={cn("pr-16", className)}
        {...props}
      />
      <button
        type="button"
        aria-pressed={visible}
        aria-label={visible ? hideLabel : showLabel}
        disabled={disabled}
        onClick={() => setVisible((prev) => !prev)}
        className="absolute inset-y-1.5 right-1.5 inline-flex items-center rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
