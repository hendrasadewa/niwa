import type { TextareaHTMLAttributes } from "react";
import { cn } from "../utils/cn";
import { baseControlClasses } from "./text-input";

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  mono?: boolean;
  invalid?: boolean;
}

export function TextArea({
  className,
  mono = false,
  invalid,
  "aria-invalid": ariaInvalid,
  ...props
}: TextAreaProps) {
  const isInvalid = invalid || ariaInvalid === true || ariaInvalid === "true";

  return (
    <textarea
      aria-invalid={isInvalid ? true : undefined}
      className={cn(
        baseControlClasses,
        "min-h-[88px] resize-y",
        mono && "font-mono text-xs leading-relaxed",
        isInvalid && "border-danger focus-visible:border-danger",
        className
      )}
      {...props}
    />
  );
}
