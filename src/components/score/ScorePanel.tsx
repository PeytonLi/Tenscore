"use client";

import { useScoreView } from "@/store/tenscore-store";

export function ScorePanel() {
  const { score, label, factors, projectedScore, contributions } = useScoreView();

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-muted uppercase">
        Tenscore
      </h2>
      <div className="mt-2 flex items-end gap-3">
        <p className="font-[family-name:var(--font-display)] text-5xl font-semibold text-teal-deep">
          {score.toFixed(1)}
        </p>
        <div className="pb-1">
          <p className="text-sm font-medium">/ 10</p>
          <p className="text-sm text-muted">{label}</p>
        </div>
      </div>
      {projectedScore !== undefined ? (
        <p className="mt-2 rounded-xl bg-teal-soft px-3 py-2 text-sm text-teal-deep">
          Projected control score: <strong>{projectedScore.toFixed(1)}</strong>
        </p>
      ) : null}
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Permission sensitivity</dt>
          <dd>{factors.permissionSensitivity.toFixed(2)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Access breadth</dt>
          <dd>{factors.accessBreadth.toFixed(2)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Dormant access</dt>
          <dd>{factors.dormantAccess.toFixed(2)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Onward sharing</dt>
          <dd>{factors.onwardSharing.toFixed(2)}</dd>
        </div>
      </dl>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium text-teal-deep">
          Why this score?
        </summary>
        <ul className="mt-2 max-h-40 space-y-2 overflow-auto text-muted">
          {contributions.map((item) => (
            <li key={item.grantId} className="rounded-lg bg-surface-2 px-2 py-1">
              <span className="font-[family-name:var(--font-mono)] text-xs">
                {item.grantId}
              </span>
              <br />
              risk {item.permissionRisk.toFixed(2)} · sens {item.factors.sensitivity} ·
              access {item.factors.access} · necessity {item.factors.necessity} ·
              recency {item.factors.recency} · sharing {item.factors.sharing}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
