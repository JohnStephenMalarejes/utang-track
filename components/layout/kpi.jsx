import { cn } from "@/lib/utils";

/** One bordered strip, cells separated by hairlines. */
export function KpiStrip({ className, children, cols = 4 }) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 shadow-card [&>*]:bg-white",
        cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Kpi({ label, value, hint, tone, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 px-5 py-4 text-slate-900">
      <p className="eyebrow flex items-center gap-1.5 text-slate-600">
        {tone && <span className={cn("h-2 w-2 rounded-full", tone)} aria-hidden="true" />}
        {label}
      </p>
      <p className="tabular truncate text-[24px] font-semibold leading-none tracking-[-0.03em] text-slate-900">{value}</p>
      {hint && <p className="text-[12px] text-slate-600">{hint}</p>}
      {children}
    </div>
  );
}

/** Thin progress meter: how much of what was owed has come back. */
export function Meter({ value, className, tone = "bg-teal-600" }) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-100", className)} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", tone)} style={{ width: `${pct}%` }} />
    </div>
  );
}
