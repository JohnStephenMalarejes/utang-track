"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const THEME_KEY = "utang-theme";
const PRIVACY_KEY = "utang-privacy";
const SIDEBAR_KEY = "utang-sidebar-collapsed";

const UIContext = createContext({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
  cycleTheme: () => {},
  privacyMode: false,
  setPrivacyMode: () => {},
  togglePrivacy: () => {},
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
  toggleSidebar: () => {},
  commandOpen: false,
  setCommandOpen: () => {},
});

function resolveThemeValue(theme) {
  if (theme === "dark" || theme === "light") return theme;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function applyThemeToDom(resolved) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#0B1120" : "#F2F3F5");
  }
}

export function UIProvider({ children }) {
  const [theme, setThemeState] = useState("system");
  const [resolvedTheme, setResolvedTheme] = useState("light");
  const [privacyMode, setPrivacyState] = useState(false);
  const [sidebarCollapsed, setSidebarState] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  // Hydrate persisted preferences on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      const nextTheme = savedTheme === "light" || savedTheme === "dark" || savedTheme === "system" ? savedTheme : "system";
      const nextResolved = resolveThemeValue(nextTheme);
      setThemeState(nextTheme);
      setResolvedTheme(nextResolved);
      applyThemeToDom(nextResolved);

      const savedPrivacy = localStorage.getItem(PRIVACY_KEY) === "true";
      setPrivacyState(savedPrivacy);
      document.documentElement.dataset.privacy = savedPrivacy ? "true" : "false";

      const savedSidebar = localStorage.getItem(SIDEBAR_KEY) === "true";
      setSidebarState(savedSidebar);
      document.documentElement.dataset.sidebarCollapsed = savedSidebar ? "true" : "false";
    } catch {
      // Ignore storage errors (private browsing)
    }
  }, []);

  // Watch OS color-scheme changes when theme === "system"
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = mq.matches ? "dark" : "light";
      setResolvedTheme(next);
      applyThemeToDom(next);
    };
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next) => {
    const valid = next === "light" || next === "dark" || next === "system" ? next : "system";
    setThemeState(valid);
    const resolved = resolveThemeValue(valid);
    setResolvedTheme(resolved);
    applyThemeToDom(resolved);
    try {
      localStorage.setItem(THEME_KEY, valid);
    } catch {}
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  const setPrivacyMode = useCallback((val) => {
    const next = Boolean(val);
    setPrivacyState(next);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.privacy = next ? "true" : "false";
    }
    try {
      localStorage.setItem(PRIVACY_KEY, String(next));
    } catch {}
  }, []);

  const togglePrivacy = useCallback(() => {
    setPrivacyMode(!privacyMode);
  }, [privacyMode, setPrivacyMode]);

  const setSidebarCollapsed = useCallback((val) => {
    const next = Boolean(val);
    setSidebarState(next);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.sidebarCollapsed = next ? "true" : "false";
    }
    try {
      localStorage.setItem(SIDEBAR_KEY, String(next));
    } catch {}
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      cycleTheme,
      privacyMode,
      setPrivacyMode,
      togglePrivacy,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,
      commandOpen,
      setCommandOpen,
    }),
    [theme, resolvedTheme, setTheme, cycleTheme, privacyMode, setPrivacyMode, togglePrivacy, sidebarCollapsed, setSidebarCollapsed, toggleSidebar, commandOpen]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  return useContext(UIContext);
}

/** Mask a formatted peso string when privacy mode is enabled. */
export function maskMoney(text, privacyMode, placeholder = "₱••••") {
  if (!privacyMode) return text;
  if (typeof text === "string" && text.includes("₱")) return placeholder;
  return text;
}
