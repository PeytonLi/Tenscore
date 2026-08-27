import { computeTenscore } from "./scoring";
import type {
  ConsentState,
  Finding,
  FindingType,
  PermissionGrant,
} from "./types";

export type FindingsOptions = {
  now?: Date;
};

const STALE_DAYS = 180;
const SENSITIVE_THRESHOLD = 4;

function daysBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24);
}

function recipientsFor(
  state: ConsentState,
  grant: PermissionGrant,
): string[] {
  return state.shares
    .filter(
      (share) =>
        share.sourceServiceId === grant.serviceId &&
        share.dataCategoryId === grant.dataCategoryId,
    )
    .map((share) => share.recipientName);
}

function classifyGrant(
  grant: PermissionGrant,
  state: ConsentState,
  now: Date,
): FindingType[] {
  const types: FindingType[] = [];
  const category = state.dataCategories.find(
    (item) => item.id === grant.dataCategoryId,
  );
  const sensitivity = category?.sensitivity ?? 1;

  if (sensitivity >= SENSITIVE_THRESHOLD) types.push("sensitive");
  if (
    grant.necessity === "unused" ||
    (grant.level === "background" && grant.necessity !== "required") ||
    (grant.level === "write" && grant.necessity !== "required") ||
    (grant.level === "admin" && grant.necessity !== "required")
  ) {
    types.push("excessive");
  }
  if (daysBetween(now, new Date(grant.lastUsedAt)) > STALE_DAYS) {
    types.push("stale");
  }
  if (recipientsFor(state, grant).length > 0) types.push("shared");

  return types;
}

function requiredFeatures(state: ConsentState, grantId: string): string[] {
  return state.features
    .filter((feature) => feature.requiredGrantIds.includes(grantId))
    .map((feature) => feature.featureName);
}

function recommendedAction(
  grant: PermissionGrant,
  types: FindingType[],
  required: string[],
): Finding["recommendedAction"] {
  if (required.length > 0 || grant.necessity === "required") return "keep";
  if (types.includes("excessive") && grant.level !== "read") {
    return "stage_downgrade";
  }
  return "stage_revoke";
}

function estimatedImpact(
  state: ConsentState,
  grant: PermissionGrant,
  now: Date,
): number {
  const before = computeTenscore(state, { now }).score;
  const afterState: ConsentState = {
    ...state,
    grants: state.grants.map((item) =>
      item.id === grant.id ? { ...item, active: false } : item,
    ),
  };
  const after = computeTenscore(afterState, { now }).score;
  return Math.round((after - before) * 10) / 10;
}

export function deriveFindings(
  state: ConsentState,
  options: FindingsOptions = {},
): Finding[] {
  const now = options.now ?? new Date();

  const findings: Finding[] = [];

  for (const grant of state.grants) {
    if (!grant.active) continue;
    const types = classifyGrant(grant, state, now);
    if (types.length === 0) continue;

    const required = requiredFeatures(state, grant.id);
    const action = recommendedAction(grant, types, required);
    const reasonParts: string[] = [];
    if (types.includes("stale")) reasonParts.push("not used in over 6 months");
    if (types.includes("excessive")) {
      reasonParts.push("access level exceeds current need");
    }
    if (types.includes("shared")) {
      reasonParts.push("shared onward with external recipients");
    }
    if (types.includes("sensitive")) {
      reasonParts.push("covers a high-sensitivity data category");
    }

    const finding: Finding = {
      id: `finding-${grant.id}`,
      grantId: grant.id,
      serviceId: grant.serviceId,
      dataCategoryId: grant.dataCategoryId,
      types,
      reason: reasonParts.join("; "),
      recommendedAction: action,
      estimatedScoreImpact: estimatedImpact(state, grant, now),
      evidence: {
        lastUsedAt: grant.lastUsedAt,
        level: grant.level,
        necessity: grant.necessity,
        purpose: grant.purpose,
        downstreamRecipients: recipientsFor(state, grant),
      },
    };

    if (required.length > 0) {
      finding.featureLossWarning = `Revoking may disable: ${required.join(", ")}`;
    }

    findings.push(finding);
  }

  return findings.sort(
    (a, b) => b.estimatedScoreImpact - a.estimatedScoreImpact,
  );
}

export function filterFindings(
  findings: Finding[],
  options: { findingTypes: FindingType[]; limit: number },
): Finding[] {
  return findings
    .filter((finding) =>
      finding.types.some((type) => options.findingTypes.includes(type)),
    )
    .slice(0, options.limit);
}
