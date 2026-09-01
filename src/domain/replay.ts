export type ReplayStep =
  | { type: "tool"; name: string; args?: Record<string, unknown> }
  | { type: "wait_approval" };

export type ReplayStatus = "idle" | "running" | "waiting_approval" | "done";

export const POWER_USER_REPLAY: ReplayStep[] = [
  { type: "tool", name: "get_consent_overview" },
  {
    type: "tool",
    name: "find_risky_access",
    args: { findingTypes: ["stale", "excessive"], limit: 5 },
  },
  {
    type: "tool",
    name: "trace_data_flow",
    args: { dataCategory: "precise_location" },
  },
  {
    type: "tool",
    name: "propose_budget_plan",
    args: {
      targetScore: 8,
      preserveFeatures: ["Budget sync", "Photo backup"],
      stage: true,
    },
  },
  { type: "wait_approval" },
  { type: "tool", name: "apply_approved_changes" },
];

export function replayStepLabel(step: ReplayStep): string {
  if (step.type === "wait_approval") {
    return "Waiting for UI approval";
  }
  return step.name;
}
