import type {
  AccessLevel,
  ConsentState,
  DataShare,
  Necessity,
  PermissionGrant,
  ScoreContribution,
  TenscoreResult,
} from "./types";

export type ScoringOptions = {
  now?: Date;
};

const ACCESS_MULTIPLIER: Record<AccessLevel, number> = {
  metadata: 0.7,
  read: 1.0,
  write: 1.35,
  background: 1.5,
  admin: 1.7,
};

const NECESSITY_MULTIPLIER: Record<Necessity, number> = {
  required: 0.35,
  useful: 0.7,
  unused: 1.0,
};

function daysBetween(later: Date, earlier: Date): number {
  const ms = later.getTime() - earlier.getTime();
  return ms / (1000 * 60 * 60 * 24);
}

function recencyMultiplier(lastUsedAt: string, now: Date): number {
  const days = daysBetween(now, new Date(lastUsedAt));
  if (days < 30) return 0.75;
  if (days <= 180) return 0.9;
  return 1.0;
}

function sharingMultiplier(
  grant: PermissionGrant,
  shares: DataShare[],
): number {
  const recipients = new Set(
    shares
      .filter(
        (share) =>
          share.sourceServiceId === grant.serviceId &&
          share.dataCategoryId === grant.dataCategoryId,
      )
      .map((share) => share.recipientName),
  );

  if (recipients.size === 0) return 1.0;
  if (recipients.size === 1) return 1.15;
  return 1.3;
}

function categorySensitivity(
  state: ConsentState,
  dataCategoryId: string,
): number {
  const category = state.dataCategories.find((item) => item.id === dataCategoryId);
  return category?.sensitivity ?? 1;
}

function permissionRisk(
  grant: PermissionGrant,
  state: ConsentState,
  now: Date,
): ScoreContribution {
  const sensitivity = categorySensitivity(state, grant.dataCategoryId);
  const access = ACCESS_MULTIPLIER[grant.level];
  const necessity = NECESSITY_MULTIPLIER[grant.necessity];
  const recency = recencyMultiplier(grant.lastUsedAt, now);
  const sharing = sharingMultiplier(grant, state.shares);

  return {
    grantId: grant.id,
    permissionRisk: sensitivity * access * necessity * recency * sharing,
    factors: { sensitivity, access, necessity, recency, sharing },
  };
}

function referenceMaxRisk(state: ConsentState, now: Date): number {
  const active = state.grants.filter((grant) => grant.active);
  if (active.length === 0) return 1;

  return active.reduce((sum, grant) => {
    const sensitivity = categorySensitivity(state, grant.dataCategoryId);
    return sum + sensitivity * ACCESS_MULTIPLIER.admin * 1.0 * 1.0 * 1.3;
  }, 0);
}

function aggregateFactors(contributions: ScoreContribution[]) {
  if (contributions.length === 0) {
    return {
      permissionSensitivity: 0,
      accessBreadth: 0,
      dormantAccess: 0,
      onwardSharing: 0,
    };
  }

  const count = contributions.length;
  return {
    permissionSensitivity:
      contributions.reduce((sum, item) => sum + item.factors.sensitivity, 0) /
      count,
    accessBreadth:
      contributions.reduce((sum, item) => sum + item.factors.access, 0) / count,
    dormantAccess:
      contributions.reduce((sum, item) => sum + item.factors.recency, 0) / count,
    onwardSharing:
      contributions.reduce((sum, item) => sum + item.factors.sharing, 0) / count,
  };
}

/**
 * Tenscore = round(10 × (1 - min(totalRisk / referenceMaxRisk, 1)), 1)
 * Higher score means more minimized consent configuration.
 */
export function computeTenscore(
  state: ConsentState,
  options: ScoringOptions = {},
): TenscoreResult {
  const now = options.now ?? new Date();
  const contributions = state.grants
    .filter((grant) => grant.active)
    .map((grant) => permissionRisk(grant, state, now));

  const totalRisk = contributions.reduce(
    (sum, item) => sum + item.permissionRisk,
    0,
  );
  const maxRisk = referenceMaxRisk(state, now);
  const ratio = Math.min(totalRisk / maxRisk, 1);
  const score = Math.round(10 * (1 - ratio) * 10) / 10;

  return {
    score,
    totalRisk,
    referenceMaxRisk: maxRisk,
    contributions,
    factors: aggregateFactors(contributions),
  };
}

export function scoreLabel(score: number): string {
  if (score < 4) return "High exposure";
  if (score < 7) return "Needs review";
  return "Well minimized";
}
