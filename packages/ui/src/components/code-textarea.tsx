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
        "w-full rounded-lg border border-neutral-800 bg-neutral-900/90 p-3 font-mono text-xs leading-relaxed text-neutral-100 placeholder-neutral-600 focus:border-emerald-500/60 focus:outline-none resize-y",
        className
      )}
      {...props}
    />
  );
}
