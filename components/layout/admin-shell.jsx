"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { useUI } from "@/components/layout/ui-provider";
import { cn } from "@/lib/utils";

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}

export function AdminShell({ email, commandIndex, children }) {
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar, togglePrivacy, setCommandOpen } = useUI();

  // Global keyboard shortcuts (Cmd/Ctrl+K, [, Shift+P, N, P)
  useEffect(() => {
    function onKeyDown(e) {
      // Cmd/Ctrl+K always opens Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((open) => !open);
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      // Don't fire single-key shortcuts when a modal/dialog is open
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;

      if (e.key === "/") {
        e.preventDefault();
        setCommandOpen(true);
      } else if (e.key === "[") {
        e.preventDefault();
        toggleSidebar();
      } else if (e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        togglePrivacy();
      } else if (!e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        router.push("/expenses?new=1");
      } else if (!e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        router.push("/payments?new=1");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, setCommandOpen, togglePrivacy, toggleSidebar]);

  return (
    <div
      className={cn(
        "min-h-dvh bg-canvas transition-[padding] duration-200 dark:bg-slate-950 lg:bg-slate-50",
        sidebarCollapsed ? "lg:pl-[68px]" : "lg:pl-60"
      )}
    >
      <Sidebar email={email} />
      <CommandPalette index={commandIndex} />
      <main className="mx-auto w-full max-w-[1200px] px-4 pb-[calc(env(safe-area-inset-bottom)+92px)] pt-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
