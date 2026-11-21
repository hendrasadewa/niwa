import type { ReactNode } from "react";

export function AuthCardLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-sm font-bold text-emerald-400">
            N
          </div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
            Niwa Identity
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-neutral-100">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-xs text-neutral-400">{subtitle}</p>
          )}
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-xl shadow-black/40">
          {children}
        </div>

        {footer && (
          <div className="text-center text-xs text-neutral-400">{footer}</div>
        )}
      </div>
    </div>
  );
}
