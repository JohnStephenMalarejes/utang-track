import { cn } from "@/lib/utils";

const TINTS = [
  "bg-teal-100 text-teal-900 ring-1 ring-teal-200",
  "bg-slate-200 text-slate-800 ring-1 ring-slate-300",
  "bg-amber-100 text-amber-900 ring-1 ring-amber-200",
  "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200",
  "bg-sky-100 text-sky-900 ring-1 ring-sky-200",
  "bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200",
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, id, size = "md", className }) {
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
}
