import { memo } from "react";
import { cn } from "@/lib/utils";

const TINTS = [
  "bg-teal-100 text-teal-900 ring-1 ring-teal-200 dark:bg-teal-950/70 dark:text-teal-200 dark:ring-teal-800/70",
  "bg-slate-200 text-slate-800 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
  "bg-amber-100 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/70 dark:text-amber-200 dark:ring-amber-800/70",
  "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-200 dark:ring-emerald-800/70",
  "bg-sky-100 text-sky-900 ring-1 ring-sky-200 dark:bg-sky-950/70 dark:text-sky-200 dark:ring-sky-800/70",
  "bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-200 dark:ring-indigo-800/70",
];

const BAR_SWATCHES = ["#0D9488", "#64748B", "#D97706", "#059669", "#0284C7", "#4F46E5"];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function avatarColor(idOrName = "") {
  return BAR_SWATCHES[hash(idOrName) % BAR_SWATCHES.length];
}

export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar = memo(function Avatar({ name, id, size = "md", className }) {
  const tint = TINTS[hash(id || name || "") % TINTS.length];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        size === "sm" ? "h-6 w-6 text-[10px]" : size === "lg" ? "h-11 w-11 text-[14px]" : "h-8 w-8 text-[11.5px]",
        tint,
        className
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
});
