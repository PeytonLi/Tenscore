"use client";

import { evaluateScenario, scenarioForProfile } from "@/domain/scenarios";
import { useTenscoreStore } from "@/store/tenscore-store";

export function ScenarioPanel() {
  const selectedProfileId = useTenscoreStore((s) => s.selectedProfileId);
  const active = useTenscoreStore((s) => s.active);
  const stagedPlan = useTenscoreStore((s) => s.stagedPlan);

  const scenario = scenarioForProfile(selectedProfileId);
  if (!scenario) return null;

  const result = evaluateScenario({ active, stagedPlan }, scenario);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-muted uppercase">
        Scenario challenge
      </h2>
      <p className="mt-1 text-sm font-medium">{scenario.title}</p>
      <p className="mt-1 text-xs text-muted">{scenario.description}</p>
      <p className="mt-2 text-sm">
        Target score: <strong>{scenario.targetScore}</strong> · Current:{" "}
        <strong>{result.score.toFixed(1)}</strong>
      </p>
      <p
        className={`mt-2 rounded-lg px-3 py-2 text-sm ${
          result.passed
            ? "bg-ok/15 text-ok"
            : "bg-warning/15 text-warning"
        }`}
      >
        {result.passed ? "Scenario passed" : "Scenario in progress"}
      </p>
      {!result.passed && result.reasons.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">
          {result.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
