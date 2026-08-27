"use client";

import { useEffect, useState } from "react";

export function CompatibilityBanner() {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const ctx =
      typeof document !== "undefined"
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (document as any).modelContext ??
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (navigator as any).modelContext
        : null;
    setAvailable(Boolean(ctx && typeof ctx.registerTool === "function"));
  }, []);

  if (available === null) return null;

  return (
    <div
      className={`rounded-xl border px-3 py-2 text-sm ${
        available
          ? "border-teal/30 bg-teal-soft text-teal-deep"
          : "border-border bg-surface text-muted"
      }`}
    >
      {available
        ? "WebMCP detected: document.modelContext is available. Tools will register for this page."
        : "WebMCP not detected in this browser. Human controls still work. Use ChatGPT’s in-app browser or Chrome 149+ with WebMCP enabled to exercise agent tools."}
    </div>
  );
}
