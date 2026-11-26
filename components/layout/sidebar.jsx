"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Receipt,
  Search,
  Settings,
  Sun,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { useViewport } from "@/hooks/use-viewport";
import { Button } from "@/components/ui/button";
import { ActionSheet } from "@/components/layout/mobile";
import { useUI } from "@/components/layout/ui-provider";
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
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/members", label: "People", icon: Users },
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

function Brand({ dark = true, collapsed = false }) {
  return (
    <Link
      href="/dashboard"
      title="Utang Tracker"
      className={cn(
        "flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
        collapsed && "justify-center"
      )}
    >
      <BrandMark surface={dark ? "card" : "light"} />
      {!collapsed && (
        <span className={cn("whitespace-nowrap text-[14.5px] font-semibold tracking-[-0.01em]", dark ? "text-white" : "text-slate-900 dark:text-white")}>
          utang <span className={cn("font-normal", dark ? "text-emerald-400" : "text-teal-600")}>tracker</span>
        </span>
      )}
    </Link>
  );
}

const isActive = (pathname, href) => pathname === href || pathname.startsWith(`${href}/`);

function NavLink({ href, label, icon: Icon, active, collapsed, onNavigate }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "group flex h-9 items-center rounded-md text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
        collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
        active ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-teal-400" : "text-slate-400 group-hover:text-white")} strokeWidth={1.85} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function NavList({ pathname, collapsed, onNavigate }) {
  return (
    <nav aria-label="Main" className={cn("flex-1 overflow-y-auto py-4", collapsed ? "space-y-3 px-2.5" : "space-y-5 px-3")}>
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          {!collapsed && <p className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">{group.label}</p>}
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink key={item.href} {...item} collapsed={collapsed} active={isActive(pathname, item.href)} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AccountBlock({ email, pathname, collapsed, onNavigate }) {
  const initial = (email || "A").trim().charAt(0).toUpperCase();
  return (
    <div className={cn("space-y-1 border-t border-slate-800", collapsed ? "p-2.5" : "p-3")}>
      <NavLink href="/settings" label="Settings" icon={Settings} collapsed={collapsed} active={isActive(pathname, "/settings")} onNavigate={onNavigate} />
      {collapsed ? (
        <div className="flex flex-col items-center gap-2 pt-1">
          <span
            title={email || "Administrator"}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[12px] font-semibold text-white ring-1 ring-slate-700"
          >
            {initial}
          </span>
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
      ) : (
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
      )}
    </div>
  );
}

/** Desktop top bar: breadcrumb on the left, quick search + privacy + theme + primary action on the right. */
function Topbar({ pathname }) {
  const { privacyMode, togglePrivacy, resolvedTheme, cycleTheme, setCommandOpen } = useUI();
  const [today, setToday] = useState("");
  useEffect(() => setToday(format(new Date(), "EEE, MMM d")), []);
  const current = ALL_ITEMS.find((i) => isActive(pathname, i.href));
  const isDetail = current && pathname !== current.href;

  return (
    <header className="sticky top-0 z-20 hidden h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white/[0.98] px-8 dark:border-slate-800 dark:bg-slate-950/95 lg:flex">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
        <span className="text-slate-500 dark:text-slate-400">Utang Tracker</span>
        {current && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            {isDetail ? (
              <Link href={current.href} className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                {current.label}
              </Link>
            ) : (
              <span className="font-semibold text-slate-900 dark:text-slate-100">{current.label}</span>
            )}
          </>
        )}
        {isDetail && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">Details</span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-2">
        {/* Global Command Palette Trigger */}
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[12.5px] text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Search members, bills…</span>
          <span className="xl:hidden">Search…</span>
          <kbd className="ml-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            Ctrl K
          </kbd>
        </button>

        {/* Privacy Mode Eye Toggle */}
        <button
          type="button"
          onClick={togglePrivacy}
          aria-pressed={privacyMode}
          aria-label={privacyMode ? "Show peso amounts" : "Hide peso amounts"}
          title={privacyMode ? "Show amounts (Shift+P)" : "Hide amounts (Shift+P)"}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
            privacyMode
              ? "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/70 dark:text-teal-300"
              : "border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          )}
        >
          {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={cycleTheme}
          aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <span className="tabular hidden h-4 text-[12px] font-medium text-slate-600 dark:text-slate-400 xl:inline">{today}</span>
        <span className="h-4 w-px bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
        <Button asChild size="sm">
          <Link href="/expenses?new=1">
            <Plus /> New expense
          </Link>
        </Button>
      </div>
    </header>
  );
}

/** Mobile top bar + bottom tab bar with a centre "create" key (< lg). */
function MobileAppShell({ pathname, email }) {
  const router = useRouter();
  const { privacyMode, togglePrivacy, setCommandOpen } = useUI();
  const [createOpen, setCreateOpen] = useState(false);
  const current = ALL_ITEMS.find((i) => isActive(pathname, i.href));
  const isDetail = current && pathname !== current.href;
  const settingsActive = isActive(pathname, "/settings");
  const reportsActive = isActive(pathname, "/reports");
  const initial = (email || "A").trim().charAt(0).toUpperCase();

  return (
    <>
      {/* Top bar: brand on root screens, back button on detail screens */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-canvas/[0.98] pt-[env(safe-area-inset-top)] dark:border-slate-800/80 lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          {isDetail ? (
            <Link
              href={current.href}
              className="press -ml-1.5 inline-flex h-10 items-center gap-0.5 rounded-full pl-1 pr-3 text-[15px] font-medium text-ink"
              aria-label={`Back to ${current.label}`}
            >
              <ChevronLeft className="h-[22px] w-[22px]" strokeWidth={2} />
              {current.label}
            </Link>
          ) : (
            <Link href="/dashboard" className="flex items-center gap-2" aria-label="Utang Tracker home">
              <img src="/logo-mark.png" alt="" className="h-7 w-7 object-contain" />
              <span className="text-[15.5px] font-semibold tracking-[-0.02em] text-ink">
                utang<span className="font-normal text-mint-deep">tracker</span>
              </span>
            </Link>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              aria-label="Quick search"
              className="press inline-flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-white dark:hover:bg-slate-800"
            >
              <Search className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </button>
            <button
              type="button"
              onClick={togglePrivacy}
              aria-pressed={privacyMode}
              aria-label={privacyMode ? "Show peso amounts" : "Hide peso amounts"}
              className={cn(
                "press inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                privacyMode ? "bg-teal-600 text-white" : "text-ink hover:bg-white dark:hover:bg-slate-800"
              )}
            >
              {privacyMode ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.9} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.9} />}
            </button>
            <Link
              href="/reports"
              aria-label="Reports"
              aria-current={reportsActive ? "page" : undefined}
              className={cn(
                "press inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                reportsActive ? "bg-ink text-white" : "text-ink hover:bg-white dark:hover:bg-slate-800"
              )}
            >
              <BarChart3 className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </Link>
            <Link
              href="/settings"
              aria-label="Settings and account"
              aria-current={settingsActive ? "page" : undefined}
              className={cn(
                "press inline-flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold transition-colors",
                settingsActive ? "bg-ink text-white" : "bg-white text-ink shadow-hairline dark:bg-slate-900"
              )}
            >
              {initial}
            </Link>
          </div>
        </div>
      </header>

      {/* Bottom tab bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/[0.98] pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-950/95 lg:hidden"
      >
        <div className="mx-auto grid h-[60px] max-w-lg grid-cols-5 items-center px-2">
          {MOBILE_TABS.slice(0, 2).map((tab) => (
            <TabLink key={tab.href} {...tab} active={isActive(pathname, tab.href)} />
          ))}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              aria-label="Create new"
              aria-haspopup="dialog"
              className="press flex h-11 w-11 items-center justify-center rounded-[14px] bg-ink text-mint shadow-[0_6px_16px_-6px_rgba(20,28,58,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2"
            >
              <Plus className="h-[22px] w-[22px]" strokeWidth={2.4} />
            </button>
          </div>
          {MOBILE_TABS.slice(2).map((tab) => (
            <TabLink key={tab.href} {...tab} active={isActive(pathname, tab.href)} />
          ))}
        </div>
      </nav>

      <ActionSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create"
        actions={[
          { label: "New expense", description: "Log a bill and split it", icon: Receipt, primary: true, onSelect: () => router.push("/expenses?new=1") },
          { label: "Record payment", description: "Someone paid you back", icon: HandCoins, onSelect: () => router.push("/payments?new=1") },
          { label: "Add member", description: "Someone you share bills with", icon: UserPlus, onSelect: () => router.push("/members?new=1") },
        ]}
      />
    </>
  );
}

function TabLink({ href, label, icon: Icon, active }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className="press flex h-full flex-col items-center justify-center gap-[3px] focus-visible:outline-none">
      <Icon className={cn("h-[21px] w-[21px] transition-colors", active ? "text-ink" : "text-slate-400 dark:text-slate-500")} strokeWidth={active ? 2.2 : 1.8} />
      <span
        className={cn(
          "text-[10.5px] leading-none tracking-[-0.005em] transition-colors",
          active ? "font-semibold text-ink" : "font-medium text-slate-500 dark:text-slate-400"
        )}
      >
        {label}
      </span>
      <span className={cn("mt-0.5 h-[3px] w-[3px] rounded-full", active ? "bg-mint-deep" : "bg-transparent")} aria-hidden="true" />
    </Link>
  );
}

export function Sidebar({ email }) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUI();
  const viewport = useViewport(1024);
  const showDesktop = viewport !== "mobile";
  const showMobile = viewport !== "desktop";

  return (
    <>
      {showDesktop && (
        <>
          {/* Desktop Sidebar (collapsible) */}
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-30 hidden flex-col bg-slate-900 text-slate-100 transition-[width] duration-200 dark:border-r dark:border-slate-800/80 dark:bg-slate-950 lg:flex",
              sidebarCollapsed ? "w-[68px]" : "w-60"
            )}
          >
            <div
              className={cn(
                "flex h-14 items-center border-b border-slate-800",
                sidebarCollapsed ? "justify-center px-2" : "justify-between pl-5 pr-3"
              )}
            >
              <Brand collapsed={sidebarCollapsed} />
              {!sidebarCollapsed && (
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar ([)"
                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              )}
            </div>

            {sidebarCollapsed && (
              <div className="flex justify-center border-b border-slate-800/70 py-2">
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label="Expand sidebar"
                  title="Expand sidebar ([)"
                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
              </div>
            )}

            <NavList pathname={pathname} collapsed={sidebarCollapsed} />
            <AccountBlock email={email} pathname={pathname} collapsed={sidebarCollapsed} />
          </aside>

          {/* Desktop Topbar */}
          <Topbar pathname={pathname} />
        </>
      )}

      {showMobile && <MobileAppShell pathname={pathname} email={email} />}
    </>
  );
}
