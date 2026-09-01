"use client";

import { buildPlanDiff } from "@/domain/diff";
import type { GrantDiff } from "@/domain/diff";
import { useTenscoreStore } from "@/store/tenscore-store";

function DiffTable({
  title,
  rows,
  emptyMessage,
}: {
  title: string;
  rows: GrantDiff[];
  emptyMessage: string;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="mt-1 text-sm text-muted">{emptyMessage}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {rows.map((row) => (
            <li
              key={row.grantId}
              className="rounded-lg bg-surface-2 px-3 py-2 text-sm"
            >
              <p className="font-medium">
                {row.serviceName} · {row.categoryLabel}
              </p>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-xs text-muted">
                {row.before} → <span className="text-teal-deep">{row.after}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ApplyDiffPanel() {
  const active = useTenscoreStore((s) => s.active);
  const stagedPlan = useTenscoreStore((s) => s.stagedPlan);
  const lastApplyDiff = useTenscoreStore((s) => s.lastApplyDiff);

  const plannedDiff =
    stagedPlan.length > 0 ? buildPlanDiff(active, stagedPlan) : [];

  if (plannedDiff.length === 0 && !lastApplyDiff?.length) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-muted uppercase">
        Permission diff
      </h2>
      {plannedDiff.length > 0 ? (
        <div className="mt-3">
          <DiffTable
            title="Staged (projected)"
            rows={plannedDiff}
            emptyMessage="No staged changes"
          />
        </div>
      ) : null}
      {lastApplyDiff && lastApplyDiff.length > 0 ? (
        <div className={plannedDiff.length > 0 ? "mt-4 border-t border-border pt-4" : "mt-3"}>
          <DiffTable
            title="Last apply (before → after)"
            rows={lastApplyDiff}
            emptyMessage="No applied changes yet"
          />
        </div>
      ) : null}
    </section>
  );
}
