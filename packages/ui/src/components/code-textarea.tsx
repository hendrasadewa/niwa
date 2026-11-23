import type { TextareaHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export type CodeTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function CodeTextarea({
  className,
  spellCheck = false,
  ...props
}: CodeTextareaProps) {
  return (
    <textarea
      spellCheck={spellCheck}
      className={cn(
        "w-full rounded-[var(--radius-md)] border border-border-strong/65 bg-surface-muted p-3 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground shadow-[var(--shadow-inset)] focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring resize-y disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}
