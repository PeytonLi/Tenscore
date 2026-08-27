"use client";

import { useRegistrationPhase, useTenscoreStore } from "@/store/tenscore-store";

const PHASE_TOOLS: Record<string, string[]> = {
  no_plan: [
    "get_consent_overview",
    "find_risky_access",
    "trace_data_flow",
    "inspect_permission",
    "simulate_changes",
    "stage_changes",
    "reset_demo_profile",
  ],
  staged: [
    "get_consent_overview",
    "find_risky_access",
    "trace_data_flow",
    "inspect_permission",
    "simulate_changes",
    "stage_changes",
    "clear_staged_plan",
    "reset_demo_profile",
  ],
  approved: [
    "get_consent_overview",
    "find_risky_access",
    "trace_data_flow",
    "inspect_permission",
    "simulate_changes",
    "clear_staged_plan",
    "apply_approved_changes",
  ],
  applied: [
    "get_consent_overview",
    "find_risky_access",
    "trace_data_flow",
    "inspect_permission",
    "simulate_changes",
    "stage_changes",
    "undo_last_change",
    "reset_demo_profile",
  ],
};

export function ToolInspector() {
  const phase = useRegistrationPhase();
  const toolTrace = useTenscoreStore((s) => s.toolTrace);
  const tools = PHASE_TOOLS[phase] ?? [];

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-muted uppercase">
        Tool inspector
      </h2>
      <p className="mt-1 text-xs text-muted">Phase: {phase}</p>
      <ul className="mt-2 flex flex-wrap gap-1">
        {tools.map((tool) => (
          <li
            key={tool}
            className={`rounded-md px-2 py-0.5 font-[family-name:var(--font-mono)] text-[11px] ${
              tool === "apply_approved_changes"
                ? "bg-teal text-white"
                : "bg-surface-2 text-muted"
            }`}
          >
            {tool}
          </li>
        ))}
      </ul>
      <h3 className="mt-3 text-xs font-semibold tracking-wide text-muted uppercase">
        Recent invocations
      </h3>
      {toolTrace.length === 0 ? (
        <p className="mt-1 text-sm text-muted">No tool calls yet.</p>
      ) : (
        <ul className="mt-2 max-h-40 space-y-2 overflow-auto text-xs">
          {toolTrace.map((entry) => (
            <li key={entry.id} className="rounded-lg bg-surface-2 px-2 py-1.5">
              <p className="font-[family-name:var(--font-mono)]">
                {entry.name} · {entry.durationMs}ms · {entry.ok ? "ok" : "error"}
              </p>
              <p className="text-muted">{entry.resultSummary}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
