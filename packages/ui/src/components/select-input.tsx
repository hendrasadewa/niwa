import type { SelectHTMLAttributes } from "react";
import { cn } from "../utils/cn";
import { baseControlClasses } from "./text-input";

export interface SelectInputProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function SelectInput({
  className,
  invalid,
  "aria-invalid": ariaInvalid,
  children,
  ...props
}: SelectInputProps) {
  const isInvalid = invalid || ariaInvalid === true || ariaInvalid === "true";

  return (
    <div className="relative">
      <select
        aria-invalid={isInvalid ? true : undefined}
        className={cn(
          baseControlClasses,
          "appearance-none pr-10 cursor-pointer",
          isInvalid && "border-danger focus-visible:border-danger",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      >
        <path d="m6 8 4 4 4-4" />
      </svg>
    </div>
  );
}
