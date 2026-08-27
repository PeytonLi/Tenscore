import { deriveFindings } from "./findings";
import { computeTenscore } from "./scoring";
import { simulateChanges } from "./simulation";
import type {
  ConsentState,
  DomainError,
  PlannedChange,
} from "./types";

export type PrivacyBudgetOptions = {
  targetScore: number;
  preserveFeatures?: string[];
  now?: Date;
  maxChanges?: number;
};

export type PrivacyBudgetResult =
  | {
      ok: true;
      changes: PlannedChange[];
      score: { before: number; after: number };
    }
  | {
      ok: false;
      changes: PlannedChange[];
      score: { before: number; after: number };
      error: DomainError;
    };

function candidateChanges(state: ConsentState, now: Date): PlannedChange[] {
  const findings = deriveFindings(state, { now });
  const changes: PlannedChange[] = [];

  for (const finding of findings) {
    if (finding.recommendedAction === "keep") continue;
    const grant = state.grants.find((item) => item.id === finding.grantId);
    if (!grant) continue;

    // Privacy budget prefers revoke for unused access; otherwise downgrade.
    if (grant.necessity === "unused" || finding.recommendedAction === "stage_revoke") {
      changes.push({ grantId: finding.grantId, action: "revoke" });
    } else {
      changes.push({
        grantId: finding.grantId,
        action: "downgrade",
        targetLevel: "read",
      });
    }
  }

  return changes;
}

/**
 * Greedy privacy-budget planner: add highest-impact safe changes until the
 * target score is met without disabling preserved features.
 */
export function proposePrivacyBudgetPlan(
  state: ConsentState,
  options: PrivacyBudgetOptions,
): PrivacyBudgetResult {
  const now = options.now ?? new Date();
  const preserveFeatures = options.preserveFeatures ?? [];
  const maxChanges = options.maxChanges ?? 12;
  const before = computeTenscore(state, { now }).score;

  if (before >= options.targetScore) {
    return {
      ok: true,
      changes: [],
      score: { before, after: before },
    };
  }

  const selected: PlannedChange[] = [];
  let bestAfter = before;

  for (const change of candidateChanges(state, now)) {
    if (selected.length >= maxChanges) break;
    const trial = [...selected, change];
    const simulation = simulateChanges(state, trial, {
      now,
      preserveFeatures,
    });
    if (!simulation.ok) continue;
    selected.push(change);
    bestAfter = simulation.score.after;
    if (bestAfter >= options.targetScore) {
      return {
        ok: true,
        changes: selected,
        score: { before, after: bestAfter },
      };
    }
  }

  return {
    ok: false,
    changes: selected,
    score: { before, after: bestAfter },
    error: {
      code: "BUDGET_UNMET",
      retryable: false,
      message: `Could not reach score ${options.targetScore} while preserving ${
        preserveFeatures.join(", ") || "no features"
      }`,
    },
  };
}
