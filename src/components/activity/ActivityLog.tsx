"use client";

import { useTenscoreStore } from "@/store/tenscore-store";

export function ActivityLog() {
  const activityLog = useTenscoreStore((s) => s.activityLog);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-muted uppercase">
        Activity log
      </h2>
      {activityLog.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No mutations yet.</p>
      ) : (
        <ul className="mt-3 max-h-48 space-y-2 overflow-auto text-sm">
          {activityLog.map((entry) => (
            <li key={entry.id} className="rounded-lg bg-surface-2 px-2 py-1.5">
              <p className="font-medium">
                {entry.action} · {entry.actor}
              </p>
              <p className="text-xs text-muted">
                v{entry.profileVersion} · {entry.at.slice(11, 19)}
                {entry.approvalUsed ? ` · approval ${entry.approvalUsed}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
