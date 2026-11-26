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
import { cn, formatPHP } from "@/lib/utils";
import { maskMoney, useUI } from "@/components/layout/ui-provider";

/* ------------------------------------------------------------------ */
/* Dates (memoized to avoid repeated parseISO/format on list renders)  */
/* ------------------------------------------------------------------ */

const MAX_DATE_CACHE = 400;
const dayLabelCache = new Map();
const shortDateCache = new Map();

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

/** "Today", "Yesterday", or "Mon, Nov 10" for a YYYY-MM-DD string. */
export function dayLabel(iso) {
  if (!iso) return "—";
  const key = `${todayKey()}:${iso}`;
  const hit = dayLabelCache.get(key);
  if (hit !== undefined) return hit;
  const d = parseISO(iso);
  const val = isToday(d)
    ? "Today"
    : isYesterday(d)
      ? "Yesterday"
      : format(d, d.getFullYear() === new Date().getFullYear() ? "EEE, MMM d" : "EEE, MMM d, yyyy");
  if (dayLabelCache.size >= MAX_DATE_CACHE) dayLabelCache.clear();
  dayLabelCache.set(key, val);
  return val;
}

/** Compact date for row metadata: "Nov 10". */
export function shortDate(iso) {
  if (!iso) return "—";
  const year = new Date().getFullYear();
  const key = `${year}:${iso}`;
  const hit = shortDateCache.get(key);
  if (hit !== undefined) return hit;
  const d = parseISO(iso);
  const val = format(d, d.getFullYear() === year ? "MMM d" : "MMM d, yyyy");
  if (shortDateCache.size >= MAX_DATE_CACHE) shortDateCache.clear();
  shortDateCache.set(key, val);
  return val;
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
/* Money display (privacy-aware)                                       */
/* ------------------------------------------------------------------ */

const wholeFormatter = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 });

/** Inline money span that masks to ₱•••• when privacy mode is enabled. */
export function PrivateMoney({ cents, className, prefix = "", forceVisible = false }) {
  const { privacyMode } = useUI();
  const hidden = privacyMode && !forceVisible;
  return <span className={cn("tabular", className)}>{hidden ? `${prefix}₱••••` : `${prefix}${formatPHP(cents)}`}</span>;
}

/** Headline amount: small muted peso sign, big whole number, small centavos. */
export function BigMoney({ cents, className, size = "text-[40px]", forceVisible = false }) {
  const { privacyMode } = useUI();
  const hidden = privacyMode && !forceVisible;
  if (hidden) {
    return (
      <p className={cn("tabular flex items-baseline font-semibold leading-none tracking-[-0.045em] text-ink", size, className)} aria-label="Amount hidden">
        <span className="mr-1.5 self-start pt-[0.12em] text-[0.5em] font-medium tracking-normal text-ink-muted">₱</span>
        <span className="tracking-[0.06em] text-ink-muted">••••••</span>
      </p>
    );
  }
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
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-slate-100 text-ink-soft dark:bg-slate-800 dark:text-slate-300",
        className
      )}
      aria-hidden="true"
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Status as quiet text (lists are noisy enough without boxed badges)  */
/* ------------------------------------------------------------------ */

const STATUS_TEXT = {
  unsettled: "text-red-600 dark:text-red-400",
  partial: "text-amber-600 dark:text-amber-400",
  settled: "text-mint-deep",
  none: "text-slate-400 dark:text-slate-500",
};
const STATUS_DOT = {
  unsettled: "bg-red-500",
  partial: "bg-amber-500",
  settled: "bg-mint",
  none: "bg-slate-300 dark:bg-slate-600",
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
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{children}</h2>
      {action}
    </div>
  );
}

/** White grouped container; children are rows separated by inset hairlines. */
export function ListGroup({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl bg-white shadow-hairline dark:bg-slate-900 [&>*+*]:border-t [&>*+*]:border-slate-100 dark:[&>*+*]:border-slate-800",
        className
      )}
      {...props}
    >
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
        {subtitle && <div className="mt-0.5 truncate text-[12.5px] leading-snug text-slate-500 dark:text-slate-400">{subtitle}</div>}
        {children}
      </div>
      {trailing}
    </Comp>
  );
}

/** Money + small caption stacked on the right of a row. */
export function Amount({ value, caption, tone = "text-ink", className, forceVisible = false }) {
  const { privacyMode } = useUI();
  const display = forceVisible ? value : maskMoney(value, privacyMode);
  return (
    <div className={cn("shrink-0 text-right", className)}>
      <div className={cn("tabular text-[14.5px] font-semibold leading-snug", tone)}>{display}</div>
      {caption && <div className="mt-0.5 text-[11.5px] leading-snug text-slate-500 dark:text-slate-400">{caption}</div>}
    </div>
  );
}

/** Underline tabs with optional counts. Scrolls horizontally if it runs out of room. */
export function UnderlineTabs({ tabs, value, onChange, className, label = "Sections" }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("no-scrollbar -mx-4 flex gap-5 overflow-x-auto border-b border-slate-200 px-4 dark:border-slate-800", className)}
    >
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
              active ? "font-semibold text-ink" : "font-medium text-slate-500 dark:text-slate-400"
            )}
          >
            {t.label}
            {t.count != null && <span className={cn("tabular ml-1.5 text-[12px]", active ? "text-ink-muted" : "text-slate-400 dark:text-slate-500")}>{t.count}</span>}
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
              active
                ? "bg-ink text-white"
                : "bg-white text-slate-700 shadow-hairline dark:bg-slate-900 dark:text-slate-200"
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
        className="h-11 w-full rounded-xl bg-white pl-10 pr-3 text-[16px] text-ink shadow-hairline placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ink/15 dark:bg-slate-900 dark:placeholder:text-slate-500 dark:focus:ring-teal-400/25"
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
      tone === "solid" ? "bg-ink text-white" : "bg-white text-ink shadow-hairline dark:bg-slate-900",
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
      className="press -mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-800"
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
    <div
      className={cn("flex h-2 w-full gap-[3px] overflow-hidden", className)}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      {pct > 0 && <div className="h-full rounded-full bg-mint transition-[width] duration-500" style={{ width: `${pct}%` }} />}
      {pct < 100 && <div className="h-full flex-1 rounded-full bg-ink dark:bg-slate-700" />}
    </div>
  );
}

/** Slim progress meter for rows. */
export function MiniMeter({ value, className }) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", className)} aria-hidden="true">
      <div className={cn("h-full rounded-full transition-[width] duration-500", pct >= 100 ? "bg-mint" : "bg-ink dark:bg-teal-400")} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Quiet empty state that sits inside a ListGroup. */
export function MobileEmpty({ icon: Icon, title, description, children }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {Icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
      )}
      <p className="text-[14.5px] font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-[18rem] text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>}
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Native-style mobile swipeable list row                              */
/* ------------------------------------------------------------------ */

const SWIPE_ACTION_WIDTH = 76;
const SWIPE_OPEN_EVENT = "utang:swipe-open";

/**
 * Wraps a mobile list row with smooth touch swipe actions.
 *  - leftAction: { label, icon, toneClass?, onSelect } revealed by swiping right
 *  - rightActions: [{ label, icon, toneClass?, onSelect }] revealed by swiping left
 */
export function SwipeableRow({ id, leftAction = null, rightActions = [], children }) {
  const rowId = React.useId();
  const key = id || rowId;
  const [offset, setOffset] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const gesture = React.useRef(null);

  const maxLeft = leftAction ? SWIPE_ACTION_WIDTH : 0;
  const maxRight = rightActions.length * SWIPE_ACTION_WIDTH;

  // Close this row if another row opens
  React.useEffect(() => {
    function onOtherOpen(e) {
      if (e.detail !== key) setOffset(0);
    }
    window.addEventListener(SWIPE_OPEN_EVENT, onOtherOpen);
    return () => window.removeEventListener(SWIPE_OPEN_EVENT, onOtherOpen);
  }, [key]);

  function onTouchStart(e) {
    if (e.touches.length !== 1 || (maxLeft === 0 && maxRight === 0)) return;
    const t = e.touches[0];
    gesture.current = { startX: t.clientX, startY: t.clientY, startOffset: offset, locked: null };
  }

  function onTouchMove(e) {
    const g = gesture.current;
    if (!g || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - g.startX;
    const dy = t.clientY - g.startY;

    if (g.locked === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      g.locked = Math.abs(dx) > Math.abs(dy) * 1.15 ? "x" : "y";
      if (g.locked === "x") {
        setDragging(true);
        window.dispatchEvent(new CustomEvent(SWIPE_OPEN_EVENT, { detail: key }));
      }
    }

    if (g.locked !== "x") return;

    let next = g.startOffset + dx;
    // Rubber-band beyond limits
    if (next > maxLeft) {
      next = maxLeft + (next - maxLeft) * 0.25;
    } else if (next < -maxRight) {
      next = -maxRight + (next + maxRight) * 0.25;
    }
    setOffset(next);
  }

  function onTouchEnd() {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.locked !== "x") {
      setDragging(false);
      return;
    }
    setDragging(false);
    if (maxLeft > 0 && offset > maxLeft * 0.42) {
      setOffset(maxLeft);
    } else if (maxRight > 0 && offset < -maxRight * 0.42) {
      setOffset(-maxRight);
    } else {
      setOffset(0);
    }
  }

  function handleContentClickCapture(e) {
    // If row is swiped open, tapping content closes it instead of navigating/triggering click
    if (offset !== 0) {
      e.preventDefault();
      e.stopPropagation();
      setOffset(0);
    }
  }

  function triggerAction(action) {
    setOffset(0);
    action.onSelect?.();
  }

  return (
    <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-800/80">
      {/* Left tray (revealed on swipe right) */}
      {leftAction && (
        <div
          className="absolute inset-y-0 left-0 flex"
          style={{ width: `${maxLeft}px`, opacity: offset > 4 ? 1 : 0, pointerEvents: offset > 20 ? "auto" : "none" }}
        >
          <button
            type="button"
            onClick={() => triggerAction(leftAction)}
            className={cn(
              "flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-[11px] font-semibold text-white transition-opacity",
              leftAction.toneClass || "bg-emerald-600"
            )}
          >
            {leftAction.icon && <leftAction.icon className="h-[18px] w-[18px]" strokeWidth={2} />}
            <span>{leftAction.label}</span>
          </button>
        </div>
      )}

      {/* Right tray (revealed on swipe left) */}
      {rightActions.length > 0 && (
        <div
          className="absolute inset-y-0 right-0 flex"
          style={{ width: `${maxRight}px`, opacity: offset < -4 ? 1 : 0, pointerEvents: offset < -20 ? "auto" : "none" }}
        >
          {rightActions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.label}
                type="button"
                onClick={() => triggerAction(act)}
                style={{ width: `${SWIPE_ACTION_WIDTH}px` }}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 px-2 text-[11px] font-semibold text-white",
                  act.toneClass || "bg-slate-800"
                )}
              >
                {Icon && <Icon className="h-[18px] w-[18px]" strokeWidth={2} />}
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Sliding foreground row */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onClickCapture={handleContentClickCapture}
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
          transition: dragging ? "none" : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className="relative z-10 bg-white dark:bg-slate-900"
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Action sheet (with drag-to-dismiss)                                 */
/* ------------------------------------------------------------------ */

/**
 * Bottom action sheet (iOS-style) for row actions and quick-create.
 * Supports dragging downward to dismiss smoothly.
 */
export function ActionSheet({ open, onOpenChange, title, description, actions }) {
  const dragRef = React.useRef(null);
  const [dragY, setDragY] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setDragY(0);
      setDragging(false);
      dragRef.current = null;
    }
  }, [open]);

  function handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    dragRef.current = { startY: e.touches[0].clientY, startTime: Date.now() };
    setDragging(true);
  }

  function handleTouchMove(e) {
    if (!dragRef.current || e.touches.length !== 1) return;
    const dy = e.touches[0].clientY - dragRef.current.startY;
    setDragY(dy > 0 ? dy : 0);
  }

  function handleTouchEnd() {
    if (!dragRef.current) return;
    const elapsed = Math.max(1, Date.now() - dragRef.current.startTime);
    const velocity = dragY / elapsed;
    const shouldClose = dragY > 80 || (dragY > 32 && velocity > 0.45);
    dragRef.current = null;
    setDragging(false);
    setDragY(0);
    if (shouldClose) onOpenChange?.(false);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          style={{
            transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
            transition: dragging ? "none" : "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg px-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)] duration-200 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
        >
          <div className="overflow-hidden rounded-[20px] bg-white shadow-sheet dark:bg-slate-900">
            <div className="flex justify-center pt-2.5" aria-hidden="true">
              <div className="h-[5px] w-9 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className={cn("px-5 pb-3 pt-2.5", !title && "sr-only")}>
              <DialogPrimitive.Title className="truncate text-[13px] font-semibold text-ink">{title || "Actions"}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-0.5 truncate text-[12.5px] text-slate-500 dark:text-slate-400">
                  {description}
                </DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">Choose an action</DialogPrimitive.Description>
              )}
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800">
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
                      "tap flex w-full items-center gap-3.5 border-b border-slate-100 px-5 py-3.5 text-left last:border-b-0 dark:border-slate-800",
                      a.destructive ? "text-red-600 dark:text-red-400" : "text-ink"
                    )}
                  >
                    {Icon && (
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
                          a.destructive
                            ? "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400"
                            : a.primary
                              ? "bg-ink text-mint"
                              : "bg-slate-100 text-ink-soft dark:bg-slate-800 dark:text-slate-200"
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium">{a.label}</span>
                      {a.description && <span className="mt-0.5 block truncate text-[12.5px] text-slate-500 dark:text-slate-400">{a.description}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <DialogPrimitive.Close className="press mt-2 h-[52px] w-full rounded-[18px] bg-white text-[15px] font-semibold text-ink shadow-sheet dark:bg-slate-900">
            Cancel
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
