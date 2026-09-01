import { computeTenscore } from "./scoring";
import type { ConsentState, PlannedChange } from "./types";
import type { SessionState } from "./mutations";

export type Scenario = {
  id: string;
  profileId: string;
  title: string;
  description: string;
  targetScore: number;
  preserveFeatures: string[];
  suggestedPlan: PlannedChange[];
};

export type ScenarioResult = {
  passed: boolean;
  reasons: string[];
  score: number;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "power-cleanup",
    profileId: "power-user",
    title: "Power User cleanup",
    description:
      "Reach score 8+ while preserving Budget sync and Photo backup.",
    targetScore: 8,
    preserveFeatures: ["Budget sync", "Photo backup"],
    suggestedPlan: [],
  },
  {
    id: "forgotten-stale",
    profileId: "forgotten-accounts",
    title: "Clear stale access",
    description: "Revoke dormant-service grants that are marked stale.",
    targetScore: 7,
    preserveFeatures: [],
    suggestedPlan: [],
  },
  {
    id: "minimalist-location",
    profileId: "minimalist",
    title: "Stop location sharing",
    description: "Improve score by addressing precise location exposure.",
    targetScore: 7.5,
    preserveFeatures: [],
    suggestedPlan: [],
  },
];

export function evaluateScenario(
  session: Pick<SessionState, "active" | "stagedPlan">,
  scenario: Scenario,
  now: Date = new Date(),
): ScenarioResult {
  const reasons: string[] = [];
  const score = computeTenscore(session.active, { now }).score;

  if (score < scenario.targetScore) {
    reasons.push(
      `Score ${score.toFixed(1)} is below target ${scenario.targetScore}`,
    );
  }

  for (const featureName of scenario.preserveFeatures) {
    const feature = session.active.features.find(
      (item) => item.featureName === featureName,
    );
    if (!feature) continue;
    const intact = feature.requiredGrantIds.every((grantId) => {
      const grant = session.active.grants.find((item) => item.id === grantId);
      return Boolean(grant?.active);
    });
    if (!intact) {
      reasons.push(`Required feature "${featureName}" is no longer available`);
    }
  }

  return {
    passed: reasons.length === 0,
    reasons,
    score,
  };
}

export function scenarioForProfile(profileId: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.profileId === profileId);
}
