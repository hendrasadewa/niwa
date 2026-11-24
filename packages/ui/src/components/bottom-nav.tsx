import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

export interface BottomNavProps extends HTMLAttributes<HTMLElement> {
  label?: string;
  /**
   * When true (default), renders fixed at the bottom of mobile viewports (`md:hidden`)
   * with iOS/Android safe-area bottom inset padding.
   * Set to false for inline previews (e.g. design system showcases).
   */
  fixed?: boolean;
  children: ReactNode;
}

export function BottomNav({
  label = "Mobile navigation",
  fixed = true,
  className,
  children,
  ...props
}: BottomNavProps) {
  const bar = (
    <nav
      aria-label={label}
      className={cn(
        "grid auto-cols-fr grid-flow-col items-stretch gap-1 rounded-[var(--radius-2xl)] border border-border bg-surface/92 px-2 py-1.5 shadow-[var(--shadow-elevated)] backdrop-blur-md",
        fixed && "pointer-events-auto mx-auto max-w-md",
        className
      )}
      {...props}
    >
      {children}
    </nav>
  );

  if (!fixed) {
    return bar;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden">
      {bar}
    </div>
  );
}

export function bottomNavItemClasses(active = false, className?: string) {
  return cn(
    "relative flex min-h-13 min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-xl)] px-1.5 py-2 text-[11px] leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-ring cursor-pointer select-none",
    active
      ? "bg-primary-soft/75 font-semibold text-primary"
      : "font-medium text-muted-foreground hover:bg-surface-subtle/70 hover:text-foreground",
    className
  );
}

export interface BottomNavItemContentProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: ReactNode;
}

export function BottomNavItemContent({
  icon,
  label,
  badge,
}: BottomNavItemContentProps) {
  return (
    <>
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        {icon}
        {badge !== undefined && badge !== null && badge !== false && (
          <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground shadow-[var(--shadow-card)]">
            {badge}
          </span>
        )}
      </span>
      <span className="block max-w-full truncate px-0.5 leading-[1.35]">
        {label}
      </span>
    </>
  );
}

export interface BottomNavItemProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: ReactNode;
}

export function BottomNavItem({
  icon,
  label,
  active = false,
  badge,
  className,
  type = "button",
  ...props
}: BottomNavItemProps) {
  return (
    <button
      type={type}
      aria-current={active ? "page" : undefined}
      className={bottomNavItemClasses(active, className)}
      {...props}
    >
      <BottomNavItemContent
        icon={icon}
        label={label}
        active={active}
        badge={badge}
      />
    </button>
  );
}
