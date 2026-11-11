"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, BarChart3, ChevronRight, LayoutDashboard, LogOut, Plus, Receipt, Settings, Users, Wallet } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Ledger",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/expenses", label: "Expenses", icon: Receipt },
      { href: "/payments", label: "Payments", icon: Wallet },
    ],
  },
  {
    label: "People",
    items: [{ href: "/members", label: "Members", icon: Users }],
  },
  {
    label: "Insights",
    items: [{ href: "/reports", label: "Reports", icon: BarChart3 }],
  },
];

const MOBILE_TABS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/members", label: "Members", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const ALL_ITEMS = [...NAV_GROUPS.flatMap((g) => g.items), { href: "/settings", label: "Settings", icon: Settings }];

/** Icon-only logo mark (/logo-mark.png, transparent background, no text). */
export function BrandMark({ className, surface = "light" }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        surface === "card" && "bg-white p-1 shadow-sm ring-1 ring-slate-200/80",
        className
      )}
    >
      <img src="/logo-mark.png" alt="Utang Tracker" className="h-full w-full object-contain" />
    </span>
  );
}

/** Full logo with "utang tracker" text (/logo-full.png, transparent background). */
export function BrandLogo({ className }) {
  return <img src="/logo-full.png" alt="Utang Tracker" className={cn("h-24 w-auto object-contain", className)} />;
}

function Brand({ dark = true }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
      <BrandMark surface={dark ? "card" : "light"} />
      <span className={cn("text-[14.5px] font-semibold tracking-[-0.01em]", dark ? "text-white" : "text-slate-900")}>
        utang <span className={cn("font-normal", dark ? "text-emerald-400" : "text-teal-600")}>tracker</span>
      </span>
    </Link>
  );
}

const isActive = (pathname, href) => pathname === href || pathname.startsWith(`${href}/`);

function NavLink({ href, label, icon: Icon, active, onNavigate }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
        active ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-teal-400" : "text-slate-400 group-hover:text-white")} strokeWidth={1.85} />
      {label}
    </Link>
  );
}

function NavList({ pathname, onNavigate }) {
  return (
    <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">{group.label}</p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink key={item.href} {...item} active={isActive(pathname, item.href)} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AccountBlock({ email, pathname, onNavigate }) {
  const initial = (email || "A").trim().charAt(0).toUpperCase();
  return (
    <div className="space-y-1 border-t border-slate-800 p-3">
      <NavLink href="/settings" label="Settings" icon={Settings} active={isActive(pathname, "/settings")} onNavigate={onNavigate} />
      <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[12px] font-semibold text-white ring-1 ring-slate-700">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium text-white">{email || "Administrator"}</p>
          <p className="text-[11px] text-slate-400">Administrator</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sign out"
            title="Sign out"
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

function SidebarPanel({ email, pathname, onNavigate }) {
  return (
    <>
      <NavList pathname={pathname} onNavigate={onNavigate} />
      <AccountBlock email={email} pathname={pathname} onNavigate={onNavigate} />
    </>
  );
}

/** Desktop top bar: breadcrumb on the left, date + primary action on the right. */
function Topbar({ pathname }) {
  const [today, setToday] = useState("");
  useEffect(() => setToday(format(new Date(), "EEE, MMM d")), []);
  const current = ALL_ITEMS.find((i) => isActive(pathname, i.href));
  const isDetail = current && pathname !== current.href;

  return (
    <header className="sticky top-0 z-20 hidden h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-8 backdrop-blur lg:flex">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px]">
        <span className="text-slate-500">Utang Tracker</span>
        {current && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            {isDetail ? (
              <Link href={current.href} className="text-slate-600 hover:text-slate-900">
                {current.label}
              </Link>
            ) : (
              <span className="font-semibold text-slate-900">{current.label}</span>
            )}
          </>
        )}
        {isDetail && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span className="font-semibold text-slate-900">Details</span>
          </>
        )}
      </nav>
      <div className="flex items-center gap-3">
        <span className="tabular h-4 text-[12px] font-medium text-slate-600">{today}</span>
        <span className="h-4 w-px bg-slate-200" aria-hidden="true" />
        <Button asChild size="sm">
          <Link href="/expenses?new=1">
            <Plus /> New expense
          </Link>
        </Button>
      </div>
    </header>
  );
}

/** Mobile top app header + fixed bottom tab navigation bar for smaller devices (< lg). */
function MobileAppShell({ pathname }) {
  const current = ALL_ITEMS.find((i) => isActive(pathname, i.href));
  const isDetail = current && pathname !== current.href;
  const settingsActive = isActive(pathname, "/settings");

  return (
    <>
      {/* Mobile App Top Bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/90 bg-white/95 px-3.5 backdrop-blur lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          {isDetail ? (
            <Link
              href={current.href}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs active:bg-slate-50"
              aria-label={`Back to ${current.label}`}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          ) : (
            <Link href="/dashboard" aria-label="Utang Tracker Home">
              <BrandMark surface="card" className="h-8 w-8" />
            </Link>
          )}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] text-slate-900">
              {isDetail ? `${current.label} · Details` : current?.label || "Utang Tracker"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button asChild size="sm" className="h-8 rounded-full px-3 text-[12px]">
            <Link href="/expenses?new=1" aria-label="New expense">
              <Plus className="h-3.5 w-3.5" /> Expense
            </Link>
          </Button>
          <Link
            href="/settings"
            aria-label="Settings"
            aria-current={settingsActive ? "page" : undefined}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
              settingsActive
                ? "border-teal-600 bg-teal-50 text-teal-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_-6px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-1">
          {MOBILE_TABS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-full flex-col items-center justify-center gap-1 rounded-xl transition-colors focus-visible:outline-none",
                  active ? "text-teal-700" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-teal-600" aria-hidden="true" />}
                <span
                  className={cn(
                    "flex h-7 w-11 items-center justify-center rounded-full transition-colors",
                    active ? "bg-teal-50 text-teal-700" : "group-hover:bg-slate-100"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.85} />
                </span>
                <span className={cn("text-[10.5px] leading-none tracking-[-0.01em]", active ? "font-semibold text-teal-800" : "font-medium text-slate-500")}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export function Sidebar({ email }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-slate-900 text-slate-100 lg:flex">
        <div className="flex h-14 items-center border-b border-slate-800 px-5">
          <Brand />
        </div>
        <SidebarPanel email={email} pathname={pathname} />
      </aside>

      {/* Desktop Topbar */}
      <Topbar pathname={pathname} />

      {/* Mobile Screen App Bar + Bottom Navigation */}
      <MobileAppShell pathname={pathname} />
    </>
  );
}
