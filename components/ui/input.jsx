"use client";

import * as React from "react";
import { Calculator } from "lucide-react";
import { centsToDecimal, cn, evaluateMoneyExpression, formatPHP, hasMathExpression } from "@/lib/utils";

// Phones get 16px text (prevents iOS focus-zoom) and 44px-tall fields; md+ keeps the dense desktop sizing.
const fieldBase =
  "w-full rounded-[10px] border border-slate-300 bg-white text-[16px] text-slate-900 shadow-sm transition-colors duration-150 placeholder:text-slate-400 hover:border-slate-400 focus-visible:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus-visible:ring-red-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus-visible:border-teal-400 dark:focus-visible:ring-teal-400/20 dark:disabled:bg-slate-800/70 dark:disabled:text-slate-500 md:rounded-md md:text-[13.5px] md:focus-visible:border-teal-600 md:focus-visible:ring-teal-600/20";

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input type={type} ref={ref} className={cn(fieldBase, "flex h-11 px-3 py-1 md:h-9", className)} {...props} />
));
Input.displayName = "Input";

const CALC_KEYS = [
  { label: "+", insert: "+" },
  { label: "−", insert: "-" },
  { label: "×", insert: "*" },
  { label: "÷", insert: "/" },
  { label: "(", insert: "(" },
  { label: ")", insert: ")" },
];

/**
 * Peso amount field with built-in inline math calculator.
 * Keeps raw text so nothing is rounded while typing; typing "145+35" or "220*2" shows a live
 * preview and resolves to "180.00" / "440.00" on Enter, blur, or tapping "=".
 */
const MoneyInput = React.forwardRef(({ className, value, onChange, onBlur, onKeyDown, disabled, ...props }, ref) => {
  const innerRef = React.useRef(null);
  const [showPad, setShowPad] = React.useState(false);

  const setRefs = React.useCallback(
    (node) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref]
  );

  const raw = value == null ? "" : String(value);
  const isExpr = hasMathExpression(raw);
  const previewCents = React.useMemo(() => (isExpr ? evaluateMoneyExpression(raw) : null), [isExpr, raw]);

  function emitValue(nextVal) {
    if (!onChange) return;
    onChange({ target: { value: nextVal }, currentTarget: { value: nextVal } });
  }

  function applyResult() {
    if (!isExpr || previewCents === null) return false;
    emitValue(centsToDecimal(previewCents));
    return true;
  }

  function insertOp(op) {
    const next = `${raw}${op}`;
    emitValue(next);
    innerRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && isExpr && previewCents !== null) {
      e.preventDefault();
      applyResult();
      return;
    }
    onKeyDown?.(e);
  }

  function handleBlur(e) {
    if (isExpr && previewCents !== null) {
      applyResult();
    }
    onBlur?.(e);
  }

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] font-medium text-slate-500 dark:text-slate-400 md:text-[13px]">
          ₱
        </span>
        <Input
          ref={setRefs}
          value={value}
          onChange={onChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          inputMode={showPad ? "text" : "decimal"}
          autoComplete="off"
          placeholder="0.00"
          className={cn("tabular pl-7 pr-9", className)}
          {...props}
        />
        {!disabled && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setShowPad((v) => !v);
              innerRef.current?.focus();
            }}
            aria-label={showPad ? "Hide calculator keys" : "Show calculator keys"}
            aria-pressed={showPad}
            title="Inline calculator (e.g. 145+35 or 220*2)"
            className={cn(
              "absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors",
              showPad || isExpr
                ? "bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            )}
          >
            <Calculator className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isExpr && (
        <div className="flex items-center justify-between gap-2 px-0.5 text-[11.5px]">
          {previewCents !== null ? (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={applyResult}
              className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-800 transition-colors hover:bg-teal-100 dark:bg-teal-950/70 dark:text-teal-300 dark:hover:bg-teal-900/60"
            >
              <span>=</span>
              <span className="tabular font-semibold">{formatPHP(previewCents)}</span>
              <span className="text-[10.5px] opacity-75">· tap or Enter</span>
            </button>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">Finish expression…</span>
          )}
        </div>
      )}

      {showPad && !disabled && (
        <div className="flex flex-wrap items-center gap-1">
          {CALC_KEYS.map((k) => (
            <button
              key={k.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertOp(k.insert)}
              className="press inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {k.label}
            </button>
          ))}
          <button
            type="button"
            disabled={previewCents === null}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              applyResult();
              setShowPad(false);
            }}
            className="press ml-auto inline-flex h-7 items-center justify-center rounded-md bg-teal-600 px-2.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-40"
          >
            =
          </button>
        </div>
      )}
    </div>
  );
});
MoneyInput.displayName = "MoneyInput";

export { Input, MoneyInput, fieldBase };
