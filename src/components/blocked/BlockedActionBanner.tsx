"use client";

import { useTenscoreStore } from "@/store/tenscore-store";

export function BlockedActionBanner() {
  const blockedAction = useTenscoreStore((s) => s.blockedAction);
  const clearBlockedAction = useTenscoreStore((s) => s.clearBlockedAction);

  if (!blockedAction) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-danger">{blockedAction.title}</p>
          <p className="mt-1 text-foreground">{blockedAction.message}</p>
          <p className="mt-2 text-muted">
            <span className="font-semibold text-teal-deep">What you should do: </span>
            {blockedAction.humanAction}
          </p>
          <p className="mt-1 font-[family-name:var(--font-mono)] text-xs text-muted">
            {blockedAction.tool} · {blockedAction.code}
          </p>
        </div>
        <button
          type="button"
          onClick={() => clearBlockedAction()}
          className="shrink-0 rounded-lg border border-border bg-surface px-2 py-1 text-xs"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
