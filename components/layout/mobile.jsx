"use client";

/**
 * Mobile building blocks shared by every screen below the `md` breakpoint.
 * The look is deliberately "banking app", not "dashboard template": grouped lists with hairlines,
 * underline tabs, tabular money, one ink colour and one mint accent taken from the logo.
 */

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { Coffee, Cookie, Dumbbell, MoreHorizontal, Receipt, Sandwich, Search, UtensilsCrossed } from "lucide-react";
import { STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

/** "Today", "Yesterday", or "Mon, Nov 10" for a YYYY-MM-DD string. */
export function dayLabel(iso) {
  if (!iso) return "—";
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, d.getFullYear() === new Date().getFullYear() ? "EEE, MMM d" : "EEE, MMM d, yyyy");
}

/** Compact date for row metadata: "Nov 10". */
export function shortDate(iso) {
  if (!iso) return "—";
  const d = parseISO(iso);
  return format(d, d.getFullYear() === new Date().getFullYear() ? "MMM d" : "MMM d, yyyy");
}

/** Groups items (already sorted) by a date key, preserving order. */
export function groupByDate(items, getDate) {
  const map = new Map();
  for (const item of items) {
    const key = getDate(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return [...map.entries()];
}

/* ------------------------------------------------------------------ */
/* Money display                                                       */
/* ------------------------------------------------------------------ */

const wholeFormatter = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 });

/** Headline amount: small muted peso sign, big whole number, small centavos. */
export function BigMoney({ cents, className, size = "text-[40px]" }) {
  const abs = Math.abs(cents || 0);
  const whole = wholeFormatter.format(Math.floor(abs / 100));
  const frac = String(abs % 100).padStart(2, "0");
  return (
    <p className={cn("tabular flex items-baseline font-semibold leading-none tracking-[-0.045em] text-ink", size, className)}>
      <span className="mr-1 self-start pt-[0.12em] text-[0.5em] font-medium tracking-normal text-ink-muted">{cents < 0 ? "−₱" : "₱"}</span>
      {whole}
      <span className="text-[0.5em] font-medium tracking-[-0.02em] text-ink-muted">.{frac}</span>
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Category glyph                                                      */
/* ------------------------------------------------------------------ */

const CATEGORY_ICONS = {
  Breakfast: Coffee,
  Lunch: Sandwich,
  Dinner: UtensilsCrossed,
  Snack: Cookie,
  "Pre-workout": Dumbbell,
};

/** Monochrome square glyph for an expense category. */
export function CategoryGlyph({ category, className }) {
  const Icon = CATEGORY_ICONS[category] ?? Receipt;
  return (
    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-slate-100 text-ink-soft", className)} aria-hidden="true">
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Status as quiet text (lists are noisy enough without boxed badges)  */
/* ------------------------------------------------------------------ */

const STATUS_TEXT = {
  unsettled: "text-red-600",
  partial: "text-amber-600",
  settled: "text-mint-deep",
  none: "text-slate-400",
};
const STATUS_DOT = {
  unsettled: "bg-red-500",
  partial: "bg-amber-500",
  settled: "bg-mint",
  none: "bg-slate-300",
};
const SHORT_STATUS = { unsettled: "Unpaid", partial: "Partial", settled: "Settled", none: "—" };

export function StatusText({ status, short = true, className }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11.5px] font-medium", STATUS_TEXT[status] ?? "text-slate-500", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status] ?? "bg-slate-300")} aria-hidden="true" />
      {short ? SHORT_STATUS[status] ?? status : STATUS_LABELS[status] ?? status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Layout pieces                                                       */
/* ------------------------------------------------------------------ */

/** Section label above a grouped list, with an optional trailing action. */
export function SectionLabel({ children, action, className }) {
  return (
    <div className={cn("mb-2 flex items-end justify-between px-1", className)}>
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">{children}</h2>
      {action}
    </div>
  );
}

/** White grouped container; children are rows separated by inset hairlines. */
export function ListGroup({ className, children, ...props }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl bg-white shadow-hairline [&>*+*]:border-t [&>*+*]:border-slate-100", className)} {...props}>
      {children}
    </div>
  );
}

/** Standard list row: leading visual, title/subtitle, trailing content. */
export function ListRow({ as: Comp = "div", leading, title, subtitle, trailing, className, children, ...props }) {
  return (
    <Comp className={cn("flex w-full items-center gap-3 px-4 py-3 text-left", className)} {...props}>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-medium leading-snug text-ink">{title}</div>
        {subtitle && <div className="mt-0.5 truncate text-[12.5px] leading-snug text-slate-500">{subtitle}</div>}
        {children}
      </div>
      {trailing}
    </Comp>
  );
}

/** Money + small caption stacked on the right of a row. */
export function Amount({ value, caption, tone = "text-ink", className }) {
  return (
    <div className={cn("shrink-0 text-right", className)}>
      <div className={cn("tabular text-[14.5px] font-semibold leading-snug", tone)}>{value}</div>
      {caption && <div className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{caption}</div>}
    </div>
  );
}

/** Underline tabs with optional counts. Scrolls horizontally if it runs out of room. */
export function UnderlineTabs({ tabs, value, onChange, className, label = "Sections" }) {
  return (
    <div role="tablist" aria-label={label} className={cn("no-scrollbar -mx-4 flex gap-5 overflow-x-auto border-b border-slate-200 px-4", className)}>
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative shrink-0 whitespace-nowrap pb-2.5 pt-1 text-[13.5px] transition-colors focus-visible:outline-none",
              active ? "font-semibold text-ink" : "font-medium text-slate-500"
            )}
          >
            {t.label}
            {t.count != null && <span className={cn("tabular ml-1.5 text-[12px]", active ? "text-ink-muted" : "text-slate-400")}>{t.count}</span>}
            <span className={cn("absolute inset-x-0 -bottom-px h-[2px] rounded-full transition-colors", active ? "bg-ink" : "bg-transparent")} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

/** Horizontal chip filter (e.g. pick a member). */
export function ChipRow({ options, value, onChange, className, label = "Filter" }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4", className)}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value || "all"}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "press h-8 shrink-0 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-medium transition-colors",
              active ? "bg-ink text-white" : "bg-white text-slate-700 shadow-hairline"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Large search field sized for thumbs (16px text so iOS doesn't zoom). */
export function SearchField({ className, ...props }) {
  return (
    <div className={cn("relative flex-1", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        type="search"
        className="h-11 w-full rounded-xl bg-white pl-10 pr-3 text-[16px] text-ink shadow-hairline placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ink/15"
        {...props}
      />
    </div>
  );
}

/** Round icon button used in mobile title rows. */
export const IconButton = React.forwardRef(({ className, tone = "plain", children, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "press inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 [&_svg]:h-[18px] [&_svg]:w-[18px]",
      tone === "solid" ? "bg-ink text-white" : "bg-white text-ink shadow-hairline",
      className
    )}
    {...props}
  >
    {children}
  </button>
));
IconButton.displayName = "IconButton";

/** "⋯" trailing button for row actions. */
export function MoreButton({ label = "More actions", ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="press -mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-ink"
      {...props}
    >
      <MoreHorizontal className="h-[18px] w-[18px]" />
    </button>
  );
}

/** Two-tone bar: how much of what was owed has come back. */
export function SplitBar({ value, className }) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className={cn("flex h-2 w-full gap-[3px] overflow-hidden", className)} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      {pct > 0 && <div className="h-full rounded-full bg-mint transition-[width] duration-500" style={{ width: `${pct}%` }} />}
      {pct < 100 && <div className="h-full flex-1 rounded-full bg-ink" />}
    </div>
  );
}

/** Slim progress meter for rows. */
export function MiniMeter({ value, className }) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-slate-100", className)} aria-hidden="true">
      <div className={cn("h-full rounded-full transition-[width] duration-500", pct >= 100 ? "bg-mint" : "bg-ink")} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Quiet empty state that sits inside a ListGroup. */
export function MobileEmpty({ icon: Icon, title, description, children }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {Icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
      )}
      <p className="text-[14.5px] font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-[18rem] text-[13px] leading-relaxed text-slate-500">{description}</p>}
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Action sheet                                                        */
/* ------------------------------------------------------------------ */

/**
 * Bottom action sheet (iOS-style) for row actions and quick-create.
 * actions: [{ label, description?, icon?, onSelect, destructive?, href? }]
 */
export function ActionSheet({ open, onOpenChange, title, description, actions }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg px-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)] duration-200 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
        >
          <div className="overflow-hidden rounded-[20px] bg-white shadow-sheet">
            <div className={cn("px-5 pb-3 pt-4", !title && "sr-only")}>
              <DialogPrimitive.Title className="truncate text-[13px] font-semibold text-ink">{title || "Actions"}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-0.5 truncate text-[12.5px] text-slate-500">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">Choose an action</DialogPrimitive.Description>
              )}
            </div>
            <div className="border-t border-slate-100">
              {actions.filter(Boolean).map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      a.onSelect?.();
                    }}
                    className={cn(
                      "tap flex w-full items-center gap-3.5 border-b border-slate-100 px-5 py-3.5 text-left last:border-b-0",
                      a.destructive ? "text-red-600" : "text-ink"
                    )}
                  >
                    {Icon && (
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
                          a.destructive ? "bg-red-50 text-red-600" : a.primary ? "bg-ink text-mint" : "bg-slate-100 text-ink-soft"
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium">{a.label}</span>
                      {a.description && <span className="mt-0.5 block truncate text-[12.5px] text-slate-500">{a.description}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <DialogPrimitive.Close className="press mt-2 h-[52px] w-full rounded-[18px] bg-white text-[15px] font-semibold text-ink shadow-sheet">Cancel</DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
