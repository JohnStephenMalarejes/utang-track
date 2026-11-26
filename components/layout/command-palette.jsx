"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  BarChart3,
  Copy,
  Eye,
  EyeOff,
  HandCoins,
  LayoutDashboard,
  Moon,
  PanelLeft,
  Plus,
  Receipt,
  Search,
  Settings,
  Sun,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/layout/avatar";
import { maskMoney, useUI } from "@/components/layout/ui-provider";
import { buildSingilMessage, cn, formatDate, formatPHP } from "@/lib/utils";

export function CommandPalette({ index }) {
  const router = useRouter();
  const { commandOpen, setCommandOpen, resolvedTheme, cycleTheme, privacyMode, togglePrivacy, toggleSidebar } = useUI();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  const members = index?.members ?? [];
  const unpaidByMember = index?.unpaidByMember ?? {};
  const recentExpenses = index?.recentExpenses ?? [];
  const paymentDetails = index?.paymentDetails ?? "";

  useEffect(() => {
    if (commandOpen) {
      setQuery("");
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [commandOpen]);

  function close() {
    setCommandOpen(false);
  }

  function go(href) {
    close();
    router.push(href);
  }

  async function copySingilFor(member) {
    const unpaid = unpaidByMember[member.id] ?? [];
    const shareUrl = member.shareToken && typeof window !== "undefined" ? `${window.location.origin}/s/${member.shareToken}` : "";
    const text = buildSingilMessage({
      memberName: member.name,
      unpaidShares: unpaid,
      paymentDetails,
      shareUrl,
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Singil copied for ${member.name}`);
      close();
    } catch {
      toast.error("Could not copy reminder message");
    }
  }

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();

    const quickActions = [
      {
        id: "act-new-expense",
        label: "New expense",
        subtitle: "Log a shared bill and split it",
        keywords: "add bill split create",
        icon: Plus,
        shortcut: "N",
        onSelect: () => go("/expenses?new=1"),
      },
      {
        id: "act-new-payment",
        label: "Record payment",
        subtitle: "Someone paid back their utang",
        keywords: "pay settle bayad",
        icon: HandCoins,
        shortcut: "P",
        onSelect: () => go("/payments?new=1"),
      },
      {
        id: "act-new-member",
        label: "Add member",
        subtitle: "Add a person you split bills with",
        keywords: "person friend barkada",
        icon: UserPlus,
        onSelect: () => go("/members?new=1"),
      },
      {
        id: "act-privacy",
        label: privacyMode ? "Show peso amounts" : "Hide peso amounts (Privacy mode)",
        subtitle: privacyMode ? "Turn off amount masking" : "Mask balances & totals with ₱••••",
        keywords: "blur mask eye hide show gcash",
        icon: privacyMode ? Eye : EyeOff,
        shortcut: "⇧P",
        onSelect: () => {
          togglePrivacy();
          close();
        },
      },
      {
        id: "act-theme",
        label: resolvedTheme === "dark" ? "Switch to Light mode" : "Switch to Dark mode",
        subtitle: "Toggle color theme",
        keywords: "theme appearance dark light night",
        icon: resolvedTheme === "dark" ? Sun : Moon,
        onSelect: () => {
          cycleTheme();
          close();
        },
      },
      {
        id: "act-sidebar",
        label: "Toggle desktop sidebar",
        subtitle: "Collapse or expand navigation rail",
        keywords: "nav collapse compact rail",
        icon: PanelLeft,
        shortcut: "[",
        onSelect: () => {
          toggleSidebar();
          close();
        },
      },
    ].filter((a) => !q || `${a.label} ${a.subtitle} ${a.keywords}`.toLowerCase().includes(q));

    const matchedMembers = members
      .filter((m) => !q || `${m.name} ${m.contact ?? ""}`.toLowerCase().includes(q))
      .slice(0, q ? 8 : 5)
      .map((m) => ({
        id: `mem-${m.id}`,
        type: "member",
        member: m,
        label: m.name,
        subtitle: m.balanceCents > 0 ? `Owes ${maskMoney(formatPHP(m.balanceCents), privacyMode)}` : m.expenseCount > 0 ? "Settled" : "No expenses",
        onSelect: () => go(`/members/${m.id}`),
      }));

    const matchedExpenses = recentExpenses
      .filter((e) => !q || `${e.description} ${e.category} ${e.date}`.toLowerCase().includes(q))
      .slice(0, q ? 8 : 4)
      .map((e) => ({
        id: `exp-${e.id}`,
        type: "expense",
        expense: e,
        label: e.description,
        subtitle: `${e.category} · ${formatDate(e.date)}`,
        trailing: maskMoney(formatPHP(e.totalCents), privacyMode),
        icon: Receipt,
        onSelect: () => go(`/expenses?q=${encodeURIComponent(e.description)}`),
      }));

    const navPages = [
      { id: "nav-dash", label: "Overview", subtitle: "Dashboard & summary", icon: LayoutDashboard, onSelect: () => go("/dashboard") },
      { id: "nav-exp", label: "Expenses", subtitle: "All shared bills", icon: Receipt, onSelect: () => go("/expenses") },
      { id: "nav-pay", label: "Payments", subtitle: "Unpaid shares & payment history", icon: Wallet, onSelect: () => go("/payments") },
      { id: "nav-mem", label: "Members", subtitle: "People & balances", icon: Users, onSelect: () => go("/members") },
      { id: "nav-rep", label: "Reports", subtitle: "Trends & analytics", icon: BarChart3, onSelect: () => go("/reports") },
      { id: "nav-set", label: "Settings", subtitle: "Appearance, payment details & exports", icon: Settings, onSelect: () => go("/settings") },
    ].filter((p) => !q || `${p.label} ${p.subtitle}`.toLowerCase().includes(q));

    const out = [];
    if (quickActions.length > 0) out.push({ title: "Quick actions", items: quickActions });
    if (matchedMembers.length > 0) out.push({ title: "People", items: matchedMembers });
    if (matchedExpenses.length > 0) out.push({ title: "Expenses", items: matchedExpenses });
    if (q && navPages.length > 0) out.push({ title: "Go to", items: navPages });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, members, recentExpenses, privacyMode, resolvedTheme]);

  const flatItems = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (flatItems.length ? (i + 1) % flatItems.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (flatItems.length ? (i - 1 + flatItems.length) % flatItems.length : 0));
    } else if (e.key === "Enter" && flatItems[activeIdx]) {
      e.preventDefault();
      flatItems[activeIdx].onSelect();
    }
  }

  let cursor = -1;

  return (
    <DialogPrimitive.Root open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onKeyDown={handleKeyDown}
          className="fixed left-1/2 top-[10vh] z-50 flex max-h-[78dvh] w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-pop duration-150 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        >
          <DialogPrimitive.Title className="sr-only">Quick jump and command palette</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Search members, expenses, or run quick actions.</DialogPrimitive.Description>

          {/* Search input */}
          <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members, expenses, or actions…"
              className="w-full bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            <kbd className="hidden shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 sm:inline-block">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-2">
            {flatItems.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No matches for “{query}”</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Try a member name, expense description, or action like “dark” or “pay”.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sections.map((section) => (
                  <div key={section.title}>
                    <p className="px-2.5 pb-1 pt-1 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-slate-400 dark:text-slate-500">
                      {section.title}
                    </p>
                    <ul className="space-y-0.5">
                      {section.items.map((item) => {
                        cursor += 1;
                        const idx = cursor;
                        const active = idx === activeIdx;
                        const Icon = item.icon;
                        return (
                          <li key={item.id}>
                            <div
                              role="option"
                              aria-selected={active}
                              onMouseEnter={() => setActiveIdx(idx)}
                              onClick={() => item.onSelect()}
                              className={cn(
                                "flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                                active ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                              )}
                            >
                              {item.type === "member" ? (
                                <Avatar name={item.member.name} id={item.member.id} size="sm" />
                              ) : (
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  <Icon className="h-3.5 w-3.5" />
                                </span>
                              )}

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13.5px] font-medium text-slate-900 dark:text-slate-100">{item.label}</p>
                                {item.subtitle && <p className="truncate text-[11.5px] text-slate-500 dark:text-slate-400">{item.subtitle}</p>}
                              </div>

                              {item.type === "member" && item.member.balanceCents > 0 && (
                                <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => go(`/payments?new=1&member=${item.member.id}`)}
                                    className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-50 px-2 text-[11.5px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/70 dark:text-emerald-300 dark:hover:bg-emerald-900/70"
                                  >
                                    <HandCoins className="h-3 w-3" />
                                    Pay
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => copySingilFor(item.member)}
                                    className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-200/70 px-2 text-[11.5px] font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-700/80 dark:text-slate-200 dark:hover:bg-slate-700"
                                  >
                                    <Copy className="h-3 w-3" />
                                    Singil
                                  </button>
                                </div>
                              )}

                              {item.trailing && (
                                <span className="tabular shrink-0 text-[12.5px] font-semibold text-slate-700 dark:text-slate-300">{item.trailing}</span>
                              )}

                              {item.shortcut && (
                                <kbd className="hidden shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10.5px] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 sm:inline-block">
                                  {item.shortcut}
                                </kbd>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="hidden items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400 sm:flex">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="font-mono">↑↓</kbd> navigate
              </span>
              <span>
                <kbd className="font-mono">↵</kbd> select
              </span>
              <span>
                <kbd className="font-mono">esc</kbd> close
              </span>
            </div>
            <span>Utang Tracker</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
