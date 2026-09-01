import type { RegistrationPhase } from "@/webmcp/tool-catalog";
import { buildCapabilityContract } from "./capabilities";

export type BlockedAction = {
  tool: string;
  code: string;
  title: string;
  message: string;
  humanAction: string;
  at: string;
};

const ERROR_COPY: Record<
  string,
  { title: string; message: string; humanAction: string }
> = {
  APPROVAL_NOT_FOUND: {
    title: "Apply denied — no UI approval",
    message: "The agent tried to apply changes without a matching approval.",
    humanAction: "Review the staged plan and click Approve this plan first.",
  },
  APPROVAL_EXPIRED: {
    title: "Apply denied — approval expired",
    message: "The UI approval window has closed.",
    humanAction: "Approve the plan again in the change plan drawer.",
  },
  APPROVAL_REUSED: {
    title: "Apply denied — approval already used",
    message: "This approval was already consumed by a prior apply.",
    humanAction: "Stage a new plan and approve it again.",
  },
  PLAN_MISMATCH: {
    title: "Apply denied — plan changed",
    message: "The staged plan was edited after approval.",
    humanAction: "Review the updated plan and approve again.",
  },
  VERSION_MISMATCH: {
    title: "Apply denied — profile changed",
    message: "The consent profile changed after approval.",
    humanAction: "Approve the current plan again.",
  },
  APPLY_UNAVAILABLE: {
    title: "Apply denied — tool not registered",
    message: "apply_approved_changes is locked until you approve in the UI.",
    humanAction: "Click Approve this plan in the change plan drawer.",
  },
  POLICY_VIOLATION: {
    title: "Plan denied — agent policy violation",
    message: "The proposed changes violate your agent policy constraints.",
    humanAction: "Adjust the agent policy or ask for a compliant plan.",
  },
};

export function buildBlockedAction(
  tool: string,
  code: string,
  phase: RegistrationPhase,
  now: Date = new Date(),
): BlockedAction {
  const known = ERROR_COPY[code];
  if (known) {
    return {
      tool,
      code,
      at: now.toISOString(),
      ...known,
    };
  }

  const contract = buildCapabilityContract(phase);
  return {
    tool,
    code,
    at: now.toISOString(),
    title: `${tool} blocked`,
    message: `This action is not allowed in phase ${phase}.`,
    humanAction: contract.humanNextStep,
  };
}

export type NextStepExplanation = {
  phase: RegistrationPhase;
  blocked: BlockedAction | null;
  humanNextStep: string;
  suggestedTools: string[];
};

export function explainNextStep(input: {
  phase: RegistrationPhase;
  blocked: BlockedAction | null;
}): NextStepExplanation {
  const contract = buildCapabilityContract(input.phase);
  const suggestedTools = contract.availableTools.filter((name) =>
    ["get_consent_overview", "find_risky_access", "simulate_changes", "stage_changes"].includes(
      name,
    ),
  );

  return {
    phase: input.phase,
    blocked: input.blocked,
    humanNextStep: input.blocked?.humanAction ?? contract.humanNextStep,
    suggestedTools,
  };
}
