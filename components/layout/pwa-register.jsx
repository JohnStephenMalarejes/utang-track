"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const isDev = process.env.NODE_ENV !== "production" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (isDev) {
        // Unregister any previously registered SW and clear stale dev caches so unhashed dev chunks never mismatch SSR HTML
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => Promise.all(regs.map((r) => r.unregister())))
          .catch(() => {});
        if ("caches" in window) {
          caches
            .keys()
            .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
            .catch(() => {});
        }
      } else {
        navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
      }
    }

    // iOS Safari gesture events only (CSS `touch-action: pan-x pan-y` handles pinch zoom natively without blocking scroll frames)
    const preventGesture = (e) => {
      e.preventDefault();
    };

    document.addEventListener("gesturestart", preventGesture, { passive: false });
    document.addEventListener("gesturechange", preventGesture, { passive: false });
    document.addEventListener("gestureend", preventGesture, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
    };
  }, []);

  return null;
}
