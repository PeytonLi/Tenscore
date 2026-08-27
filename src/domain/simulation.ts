import { computeTenscore } from "./scoring";
import type {
  AccessLevel,
  ConsentState,
  DomainError,
  FeatureImpact,
  PlannedChange,
} from "./types";

const LEVEL_RANK: Record<AccessLevel, number> = {
  metadata: 0,
  read: 1,
  write: 2,
  background: 3,
  admin: 4,
};

export type SimulateOptions = {
  now?: Date;
  preserveFeatures?: string[];
};

export type SimulationResult = {
  ok: boolean;
  score: { before: number; after: number };
  projectedState: ConsentState;
  featureImpacts: FeatureImpact[];
  constraintViolations: string[];
  error?: DomainError;
};

function applyChangeToGrants(
  state: ConsentState,
  change: PlannedChange,
): ConsentState | DomainError {
  const grant = state.grants.find((item) => item.id === change.grantId);
  if (!grant || !grant.active) {
    return {
      code: "INVALID_GRANT",
      retryable: false,
      message: `Unknown or inactive grant: ${change.grantId}`,
    };
  }

  if (change.action === "downgrade") {
    if (!change.targetLevel) {
      return {
        code: "INVALID_DOWNGRADE",
        retryable: false,
        message: "Downgrade requires targetLevel",
      };
    }
    if (LEVEL_RANK[change.targetLevel] >= LEVEL_RANK[grant.level]) {
      return {
        code: "INVALID_DOWNGRADE",
        retryable: false,
        message: "targetLevel must be strictly lower than current level",
      };
    }
  }

  return {
    ...state,
    grants: state.grants.map((item) => {
      if (item.id !== change.grantId) return item;
      if (change.action === "revoke") return { ...item, active: false };
      return { ...item, level: change.targetLevel! };
    }),
  };
}

function featureImpactsFor(
  before: ConsentState,
  after: ConsentState,
): FeatureImpact[] {
  return before.features.map((feature) => {
    const requiredLost = feature.requiredGrantIds.some((grantId) => {
      const beforeGrant = before.grants.find((g) => g.id === grantId);
      const afterGrant = after.grants.find((g) => g.id === grantId);
      return Boolean(beforeGrant?.active) && !afterGrant?.active;
    });

    if (requiredLost) {
      return {
        featureId: feature.id,
        featureName: feature.featureName,
        serviceId: feature.serviceId,
        effect: "disabled" as const,
      };
    }

    const degraded = feature.degradedGrantIds.some((grantId) => {
      const beforeGrant = before.grants.find((g) => g.id === grantId);
      const afterGrant = after.grants.find((g) => g.id === grantId);
      if (!beforeGrant || !afterGrant) return false;
      if (beforeGrant.active && !afterGrant.active) return true;
      return LEVEL_RANK[afterGrant.level] < LEVEL_RANK[beforeGrant.level];
    });

    return {
      featureId: feature.id,
      featureName: feature.featureName,
      serviceId: feature.serviceId,
      effect: degraded ? ("degraded" as const) : ("unchanged" as const),
    };
  });
}

export function simulateChanges(
  state: ConsentState,
  changes: PlannedChange[],
  options: SimulateOptions = {},
): SimulationResult {
  const now = options.now ?? new Date();
  const beforeScore = computeTenscore(state, { now }).score;

  let projected: ConsentState = {
    ...state,
    grants: state.grants.map((grant) => ({ ...grant })),
    shares: state.shares.map((share) => ({ ...share })),
    features: state.features.map((feature) => ({
      ...feature,
      requiredGrantIds: [...feature.requiredGrantIds],
      degradedGrantIds: [...feature.degradedGrantIds],
    })),
  };

  for (const change of changes) {
    const next = applyChangeToGrants(projected, change);
    if ("code" in next) {
      return {
        ok: false,
        score: { before: beforeScore, after: beforeScore },
        projectedState: state,
        featureImpacts: [],
        constraintViolations: [],
        error: next,
      };
    }
    projected = next;
  }

  const impacts = featureImpactsFor(state, projected);
  const preserve = options.preserveFeatures ?? [];
  const violations = impacts
    .filter(
      (impact) =>
        impact.effect === "disabled" && preserve.includes(impact.featureName),
    )
    .map((impact) => impact.featureName);

  const afterScore = computeTenscore(projected, { now }).score;

  if (violations.length > 0) {
    return {
      ok: false,
      score: { before: beforeScore, after: afterScore },
      projectedState: projected,
      featureImpacts: impacts,
      constraintViolations: violations,
      error: {
        code: "FEATURE_CONSTRAINT_VIOLATION",
        retryable: false,
        message: `Changes would disable preserved features: ${violations.join(", ")}`,
      },
    };
  }

  return {
    ok: true,
    score: { before: beforeScore, after: afterScore },
    projectedState: projected,
    featureImpacts: impacts,
    constraintViolations: [],
  };
}
