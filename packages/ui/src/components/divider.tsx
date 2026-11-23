import { cn } from "../utils/cn";

export interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className }: DividerProps) {
  if (!label) {
    return <hr className={cn("border-0 border-t border-border", className)} />;
  }

  return (
    <div
      role="separator"
      className={cn("flex items-center gap-3 py-1", className)}
    >
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
