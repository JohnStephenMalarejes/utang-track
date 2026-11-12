"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }

    // iOS Safari & standalone PWAs ignore `user-scalable=no` for pinch-to-zoom
    // unless WebKit gesture events and multi-touch move events are cancelled.
    const preventGesture = (e) => {
      e.preventDefault();
    };

    const preventPinchMove = (e) => {
      if ((e.touches && e.touches.length > 1) || (typeof e.scale === "number" && e.scale !== 1)) {
        e.preventDefault();
      }
    };

    const preventCtrlWheelZoom = (e) => {
      if (e.ctrlKey) e.preventDefault();
    };

    document.addEventListener("gesturestart", preventGesture, { passive: false });
    document.addEventListener("gesturechange", preventGesture, { passive: false });
    document.addEventListener("gestureend", preventGesture, { passive: false });
    document.addEventListener("touchmove", preventPinchMove, { passive: false });
    document.addEventListener("wheel", preventCtrlWheelZoom, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      document.removeEventListener("touchmove", preventPinchMove);
      document.removeEventListener("wheel", preventCtrlWheelZoom);
    };
  }, []);

  return null;
}
