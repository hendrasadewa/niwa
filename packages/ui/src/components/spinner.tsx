import { cn } from "../utils/cn";

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block animate-spin rounded-full border-border border-t-primary",
        sizeClasses[size],
        className
      )}
    />
  );
}

export interface FullPageLoaderProps {
  label?: string;
}

export function FullPageLoader({ label = "Loading..." }: FullPageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-muted-foreground"
    >
      <Spinner size="md" />
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
}
