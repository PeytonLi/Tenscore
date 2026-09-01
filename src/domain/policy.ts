import { deriveFindings } from "./findings";
import { simulateChanges } from "./simulation";
import type { ConsentState, DomainError, PlannedChange } from "./types";

export type AgentPolicy = {
  onlyStale: boolean;
  blockedCategoryIds: string[];
  preserveFeatures: string[];
};

export const DEFAULT_AGENT_POLICY: AgentPolicy = {
  onlyStale: false,
  blockedCategoryIds: [],
  preserveFeatures: ["Budget sync", "Photo backup"],
};

export type PolicyValidation =
  | { ok: true }
  | { ok: false; violations: string[]; error: DomainError };

export function validatePlanAgainstPolicy(
  state: ConsentState,
  plan: PlannedChange[],
  policy: AgentPolicy,
  now: Date = new Date(),
): PolicyValidation {
  const violations: string[] = [];
  const findings = deriveFindings(state, { now });
  const staleGrantIds = new Set(
    findings
      .filter((f) => f.types.includes("stale"))
      .map((f) => f.grantId),
  );

  for (const change of plan) {
    const grant = state.grants.find((g) => g.id === change.grantId);
    if (!grant) continue;

    if (policy.blockedCategoryIds.includes(grant.dataCategoryId)) {
      violations.push(
        `Policy blocks changes to ${grant.dataCategoryId} (${grant.id})`,
      );
    }

    if (policy.onlyStale && !staleGrantIds.has(change.grantId)) {
      violations.push(
        `Policy allows only stale grants; ${grant.id} is not stale`,
      );
    }
  }

  if (policy.preserveFeatures.length > 0) {
    const simulation = simulateChanges(state, plan, {
      now,
      preserveFeatures: policy.preserveFeatures,
    });
    violations.push(...simulation.constraintViolations);
  }

  if (violations.length > 0) {
    return {
      ok: false,
      violations,
      error: {
        code: "POLICY_VIOLATION",
        retryable: false,
        message: violations.join("; "),
      },
    };
  }

  return { ok: true };
}
