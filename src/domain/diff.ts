import type { ConsentState, PlannedChange } from "./types";

export type GrantDiff = {
  grantId: string;
  serviceName: string;
  categoryLabel: string;
  before: string;
  after: string;
  action: "revoke" | "downgrade" | "unchanged";
};

export function buildPlanDiff(
  state: ConsentState,
  plan: PlannedChange[],
): GrantDiff[] {
  return plan.map((change) => {
    const grant = state.grants.find((g) => g.id === change.grantId);
    const service = state.services.find((s) => s.id === grant?.serviceId);
    const category = state.dataCategories.find(
      (c) => c.id === grant?.dataCategoryId,
    );
    const before = grant
      ? `${grant.level} · ${grant.necessity}`
      : "unknown";
    const after =
      change.action === "revoke"
        ? "revoked"
        : `${change.targetLevel ?? "read"} · ${grant?.necessity ?? "useful"}`;

    return {
      grantId: change.grantId,
      serviceName: service?.name ?? change.grantId,
      categoryLabel: category?.label ?? grant?.dataCategoryId ?? "",
      before,
      after,
      action: change.action,
    };
  });
}

export function buildApplyDiff(
  before: ConsentState,
  after: ConsentState,
  plan: PlannedChange[],
): GrantDiff[] {
  return buildPlanDiff(before, plan).map((item) => {
    const grantAfter = after.grants.find((g) => g.id === item.grantId);
    if (!grantAfter) {
      return { ...item, after: "revoked", action: "revoke" as const };
    }
    if (!grantAfter.active) {
      return { ...item, after: "revoked", action: "revoke" as const };
    }
    return {
      ...item,
      after: `${grantAfter.level} · ${grantAfter.necessity}`,
      action: "downgrade",
    };
  });
}
