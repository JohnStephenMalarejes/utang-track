"use client";

import { Eye, EyeOff, Keyboard, Monitor, Moon, PanelLeft, Sun } from "lucide-react";
import { useUI } from "@/components/layout/ui-provider";
import { cn } from "@/lib/utils";

const THEMES = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

export function AppearanceControls({ compact = false }) {
  const { theme, setTheme, privacyMode, togglePrivacy, sidebarCollapsed, toggleSidebar } = useUI();

  return (
    <div className="space-y-4">
      {/* Theme selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[13.5px] font-medium text-slate-900 dark:text-slate-100">Color theme</p>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">Match your device or lock light/dark mode.</p>
          </div>
        </div>
        <div
          role="radiogroup"
          aria-label="Color theme"
          className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-800/70"
        >
          {THEMES.map(({ id, label, icon: Icon }) => {
            const active = theme === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(id)}
                className={cn(
                  "press inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-medium transition-colors",
                  active
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Privacy mode toggle */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3.5 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-medium text-slate-900 dark:text-slate-100">Privacy mode</p>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">Mask peso amounts (₱••••) in public.</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={privacyMode}
          onClick={togglePrivacy}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
            privacyMode ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-700"
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
              privacyMode ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>

      {/* Compact sidebar toggle (desktop only) */}
      {!compact && (
        <div className="hidden items-center justify-between gap-3 border-t border-slate-100 pt-3.5 dark:border-slate-800 lg:flex">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <PanelLeft className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-slate-900 dark:text-slate-100">Compact sidebar</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">Collapse desktop navigation into an icon rail.</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={sidebarCollapsed}
            onClick={toggleSidebar}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
              sidebarCollapsed ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-700"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                sidebarCollapsed ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      )}

      {/* Desktop keyboard shortcuts reference */}
      {!compact && (
        <div className="hidden border-t border-slate-100 pt-3.5 dark:border-slate-800 lg:block">
          <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-400">
            <Keyboard className="h-3.5 w-3.5" /> Keyboard shortcuts
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px] text-slate-600 dark:text-slate-400">
            <div className="flex items-center justify-between">
              <span>Quick jump / search</span>
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10.5px] dark:border-slate-700 dark:bg-slate-800">
                Ctrl K
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>New expense</span>
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10.5px] dark:border-slate-700 dark:bg-slate-800">
                N
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Record payment</span>
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10.5px] dark:border-slate-700 dark:bg-slate-800">
                P
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Toggle privacy mode</span>
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10.5px] dark:border-slate-700 dark:bg-slate-800">
                ⇧ P
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span>Collapse sidebar</span>
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10.5px] dark:border-slate-700 dark:bg-slate-800">
                [
              </kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
