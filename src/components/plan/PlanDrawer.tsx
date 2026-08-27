"use client";

import {
  usePlanHash,
  useScoreView,
  useTenscoreStore,
} from "@/store/tenscore-store";

export function PlanDrawer() {
  const stagedPlan = useTenscoreStore((s) => s.stagedPlan);
  const approval = useTenscoreStore((s) => s.approval);
  const active = useTenscoreStore((s) => s.active);
  const clearPlan = useTenscoreStore((s) => s.clearPlan);
  const approve = useTenscoreStore((s) => s.approve);
  const apply = useTenscoreStore((s) => s.apply);
  const { projectedScore, simulation } = useScoreView();
  const planHash = usePlanHash();

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-muted uppercase">
        Change plan
      </h2>
      {stagedPlan.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          No staged changes. Stage from findings or ask an agent to prepare a plan.
        </p>
      ) : (
        <>
          <ul className="mt-3 space-y-2">
            {stagedPlan.map((change) => {
              const grant = active.grants.find((g) => g.id === change.grantId);
              const service = active.services.find(
                (s) => s.id === grant?.serviceId,
              );
              return (
                <li
                  key={`${change.grantId}-${change.action}`}
                  className="rounded-xl bg-surface-2 px-3 py-2 text-sm"
                >
                  <p className="font-medium">
                    {change.action} · {service?.name ?? change.grantId}
                  </p>
                  <p className="text-xs text-muted">
                    {grant?.level}
                    {change.targetLevel ? ` → ${change.targetLevel}` : " → revoked"}
                  </p>
                </li>
              );
            })}
          </ul>
          {simulation ? (
            <div className="mt-3 space-y-1 text-sm">
              <p>
                Projected score:{" "}
                <strong>{projectedScore?.toFixed(1)}</strong> (from{" "}
                {simulation.score.before.toFixed(1)})
              </p>
              {simulation.featureImpacts
                .filter((f) => f.effect !== "unchanged")
                .map((impact) => (
                  <p key={impact.featureId} className="text-xs text-warning">
                    {impact.effect}: {impact.featureName}
                  </p>
                ))}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => clearPlan("user")}
              className="rounded-xl border border-border px-3 py-2 text-sm"
            >
              Clear plan
            </button>
            {!approval ? (
              <button
                type="button"
                onClick={() => approve()}
                className="rounded-xl bg-teal px-3 py-2 text-sm font-semibold text-white"
              >
                Approve this plan
              </button>
            ) : (
              <button
                type="button"
                onClick={() => apply(approval.id, "user")}
                className="rounded-xl bg-teal-deep px-3 py-2 text-sm font-semibold text-white"
              >
                Apply approved plan
              </button>
            )}
          </div>
          {approval ? (
            <p className="mt-2 text-xs text-teal-deep">
              Approval {approval.id} active until {approval.expiresAt.slice(11, 16)} UTC.
              Apply tool is now available to agents. Plan hash:{" "}
              <span className="font-[family-name:var(--font-mono)]">{planHash.slice(0, 24)}…</span>
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted">
              Approval is required in this UI before apply tools can run.
            </p>
          )}
        </>
      )}
    </section>
  );
}
