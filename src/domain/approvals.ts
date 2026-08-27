import type { Approval, DomainError, PlannedChange } from "./types";

const APPROVAL_TTL_MS = 5 * 60 * 1000;

export function normalizePlan(changes: PlannedChange[]): PlannedChange[] {
  return [...changes]
    .map((change) => ({
      grantId: change.grantId,
      action: change.action,
      ...(change.targetLevel ? { targetLevel: change.targetLevel } : {}),
    }))
    .sort((a, b) => {
      const byGrant = a.grantId.localeCompare(b.grantId);
      if (byGrant !== 0) return byGrant;
      return a.action.localeCompare(b.action);
    });
}

export function hashPlan(plan: PlannedChange[]): string {
  return `plan_${JSON.stringify(normalizePlan(plan))}`;
}

export function createApproval(input: {
  profileId: string;
  profileVersion: number;
  planHash: string;
  now: Date;
  id?: string;
}): Approval {
  return {
    id: input.id ?? `apr_${input.now.getTime()}`,
    profileId: input.profileId,
    profileVersion: input.profileVersion,
    planHash: input.planHash,
    expiresAt: new Date(input.now.getTime() + APPROVAL_TTL_MS).toISOString(),
  };
}

export type ApprovalContext = {
  profileId: string;
  profileVersion: number;
  planHash: string;
  now: Date;
};

export type ApprovalValidation =
  | { ok: true }
  | { ok: false; error: DomainError };

export function validateApproval(
  approval: Approval,
  context: ApprovalContext,
): ApprovalValidation {
  if (approval.profileId !== context.profileId) {
    return {
      ok: false,
      error: {
        code: "PROFILE_MISMATCH",
        retryable: false,
        message: "Approval belongs to a different profile",
      },
    };
  }

  if (approval.profileVersion !== context.profileVersion) {
    return {
      ok: false,
      error: {
        code: "VERSION_MISMATCH",
        retryable: false,
        message: "Profile version changed after approval",
      },
    };
  }

  if (approval.planHash !== context.planHash) {
    return {
      ok: false,
      error: {
        code: "PLAN_MISMATCH",
        retryable: false,
        message: "Staged plan no longer matches approval",
      },
    };
  }

  if (approval.usedAt) {
    return {
      ok: false,
      error: {
        code: "APPROVAL_REUSED",
        retryable: false,
        message: "Approval has already been used",
      },
    };
  }

  if (new Date(approval.expiresAt).getTime() <= context.now.getTime()) {
    return {
      ok: false,
      error: {
        code: "APPROVAL_EXPIRED",
        retryable: false,
        message: "Approval expired",
      },
    };
  }

  return { ok: true };
}
