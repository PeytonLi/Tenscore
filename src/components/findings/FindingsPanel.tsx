"use client";

import {
  useFindingsView,
  useTenscoreStore,
} from "@/store/tenscore-store";
import type { FindingType } from "@/domain/types";

const FILTERS: Array<{ id: FindingType[] | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: ["sensitive"], label: "Sensitive" },
  { id: ["stale"], label: "Stale" },
  { id: ["shared"], label: "Shared" },
  { id: ["excessive"], label: "Excessive" },
];

export function FindingsPanel() {
  const findings = useFindingsView();
  const setFindingFilter = useTenscoreStore((s) => s.setFindingFilter);
  const findingFilter = useTenscoreStore((s) => s.findingFilter);
  const stage = useTenscoreStore((s) => s.stage);
  const stagedPlan = useTenscoreStore((s) => s.stagedPlan);
  const setSelectedGrantId = useTenscoreStore((s) => s.setSelectedGrantId);
  const active = useTenscoreStore((s) => s.active);

  function stageOne(
    change: {
      grantId: string;
      action: "revoke" | "downgrade";
      targetLevel?: "read";
    },
  ) {
    const without = stagedPlan.filter((item) => item.grantId !== change.grantId);
    stage([...without, change], "user");
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-muted uppercase">
        Findings
      </h2>
      <p className="mt-1 text-sm text-muted">
        {findings.length} permissions deserve review
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const selected =
            filter.id === "all"
              ? findingFilter === "all"
              : Array.isArray(findingFilter) &&
                findingFilter.join() === filter.id.join();
          return (
            <button
              key={filter.label}
              type="button"
              onClick={() => setFindingFilter(filter.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                selected
                  ? "bg-teal text-white"
                  : "bg-surface-2 text-muted hover:text-foreground"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
      <ul className="mt-3 max-h-[360px] space-y-2 overflow-auto">
        {findings.map((finding) => {
          const service = active.services.find((s) => s.id === finding.serviceId);
          return (
            <li
              key={finding.id}
              className="rounded-xl border border-border bg-surface-2/60 p-3"
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setSelectedGrantId(finding.grantId)}
              >
                <p className="text-sm font-semibold">
                  {service?.name ?? finding.serviceId}
                </p>
                <p className="mt-1 text-xs text-muted">{finding.reason}</p>
                <p className="mt-1 text-xs">
                  Impact +{finding.estimatedScoreImpact.toFixed(1)} ·{" "}
                  {finding.types.join(", ")}
                </p>
                {finding.featureLossWarning ? (
                  <p className="mt-1 text-xs text-warning">
                    {finding.featureLossWarning}
                  </p>
                ) : null}
              </button>
              <div className="mt-2 flex flex-wrap gap-2">
                {finding.recommendedAction === "stage_revoke" ? (
                  <button
                    type="button"
                    className="rounded-lg bg-teal px-2 py-1 text-xs font-medium text-white"
                    onClick={() =>
                      stageOne({ grantId: finding.grantId, action: "revoke" })
                    }
                  >
                    Stage revoke
                  </button>
                ) : null}
                {finding.recommendedAction === "stage_downgrade" ? (
                  <button
                    type="button"
                    className="rounded-lg bg-teal px-2 py-1 text-xs font-medium text-white"
                    onClick={() =>
                      stageOne({
                        grantId: finding.grantId,
                        action: "downgrade",
                        targetLevel: "read",
                      })
                    }
                  >
                    Stage downgrade
                  </button>
                ) : (
                  <span className="text-xs font-medium text-ok">Keep recommended</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
