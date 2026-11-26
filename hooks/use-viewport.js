"use client";

import { useEffect, useState } from "react";

/**
 * Tracks whether the viewport is mobile or desktop at a given breakpoint (px).
 * Returns "unknown" during SSR and first paint so CSS breakpoints prevent layout flash,
 * then resolves to "mobile" or "desktop" on mount so React only keeps ONE view tree mounted.
 */
export function useViewport(minWidth = 768) {
  const [mode, setMode] = useState("unknown");

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    const update = () => setMode(mq.matches ? "desktop" : "mobile");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [minWidth]);

  return mode;
}
