import type { RegistrationPhase } from "@/webmcp/tool-catalog";
import { getToolsForPhase } from "@/webmcp/tool-catalog";

export const ALL_AGENT_TOOLS = [
  "get_consent_overview",
  "find_risky_access",
  "trace_data_flow",
  "inspect_permission",
  "simulate_changes",
  "propose_budget_plan",
  "get_redacted_report",
  "get_exposure_timeline",
  "get_agent_capabilities",
  "explain_next_step",
  "get_consent_receipt",
  "stage_changes",
  "clear_staged_plan",
  "apply_approved_changes",
  "add_manual_service",
  "undo_last_change",
  "reset_demo_profile",
] as const;

export type AgentToolName = (typeof ALL_AGENT_TOOLS)[number];

export type DeniedTool = {
  name: AgentToolName;
  reason: string;
};

export type CapabilityContract = {
  phase: RegistrationPhase;
  availableTools: AgentToolName[];
  deniedTools: DeniedTool[];
  humanNextStep: string;
  summary: string;
};

const DENIAL_REASONS: Partial<Record<AgentToolName, string>> = {
  apply_approved_changes:
    "Locked until you approve the staged plan in the Tenscore UI.",
  stage_changes:
    "Unavailable while a plan is approved — apply or clear the plan first.",
  undo_last_change: "Available only after a successful apply.",
};

function denialReason(
  tool: AgentToolName,
  phase: RegistrationPhase,
): string {
  if (DENIAL_REASONS[tool]) return DENIAL_REASONS[tool]!;
  if (tool === "stage_changes" && phase === "approved") {
    return "Unavailable while awaiting apply — clear the plan or apply first.";
  }
  if (tool === "apply_approved_changes") {
    return "Locked until you approve the staged plan in the Tenscore UI.";
  }
  return "Not registered in the current lifecycle phase.";
}

export function buildCapabilityContract(
  phase: RegistrationPhase,
): CapabilityContract {
  const registered = new Set(
    getToolsForPhase(phase).map((tool) => tool.name),
  );

  const availableTools = ALL_AGENT_TOOLS.filter((name) =>
    registered.has(name),
  ) as AgentToolName[];

  const deniedTools: DeniedTool[] = ALL_AGENT_TOOLS.filter(
    (name) => !registered.has(name),
  ).map((name) => ({
    name,
    reason: denialReason(name, phase),
  }));

  let humanNextStep: string;
  switch (phase) {
    case "no_plan":
      humanNextStep =
        "Ask the agent to inspect access and stage a remediation plan, or stage changes from findings.";
      break;
    case "staged":
      humanNextStep =
        "Review the change plan, then click Approve this plan to unlock apply for the agent.";
      break;
    case "approved":
      humanNextStep =
        "Approval is active — ask the agent to apply, or clear the plan to cancel.";
      break;
    case "applied":
      humanNextStep =
        "Changes are live. Undo, reset, or ask the agent to stage another plan.";
      break;
  }

  const summary = `${availableTools.length} tools available, ${deniedTools.length} denied · phase ${phase}`;

  return {
    phase,
    availableTools,
    deniedTools,
    humanNextStep,
    summary,
  };
}
