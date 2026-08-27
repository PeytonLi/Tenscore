import {
  createApproval,
  hashPlan,
  normalizePlan,
  validateApproval,
} from "./approvals";
import { simulateChanges } from "./simulation";
import type {
  Approval,
  ConsentState,
  DemoProfile,
  DomainError,
  PlannedChange,
} from "./types";

export type ActivityActor = "user" | "agent" | "system";

export type ActivityEntry = {
  id: string;
  at: string;
  actor: ActivityActor;
  action:
    | "stage"
    | "clear_plan"
    | "approve"
    | "apply"
    | "undo"
    | "reset";
  targetIds: string[];
  result: "ok" | "error";
  profileVersion: number;
  approvalUsed?: string;
  message?: string;
};

export type SessionState = {
  active: ConsentState;
  stagedPlan: PlannedChange[];
  approval: Approval | null;
  undoSnapshot: ConsentState | null;
  activityLog: ActivityEntry[];
};

export type MutationResult =
  | { ok: true; session: SessionState }
  | { ok: false; session: SessionState; error: DomainError };

function log(
  session: SessionState,
  entry: Omit<ActivityEntry, "id">,
): ActivityEntry[] {
  return [
    {
      id: `log_${entry.at}_${entry.action}`,
      ...entry,
    },
    ...session.activityLog,
  ];
}

export function stageChanges(
  session: SessionState,
  changes: PlannedChange[],
  meta: { actor?: ActivityActor; now?: Date } = {},
): MutationResult {
  const grantIds = changes.map((change) => change.grantId);
  if (new Set(grantIds).size !== grantIds.length) {
    return {
      ok: false,
      session,
      error: {
        code: "CONFLICTING_CHANGES",
        retryable: false,
        message: "Duplicate or conflicting grant changes in plan",
      },
    };
  }

  for (const change of changes) {
    const exists = session.active.grants.some(
      (grant) => grant.id === change.grantId && grant.active,
    );
    if (!exists) {
      return {
        ok: false,
        session,
        error: {
          code: "INVALID_GRANT",
          retryable: false,
          message: `Unknown or inactive grant: ${change.grantId}`,
        },
      };
    }
    if (change.action === "downgrade" && !change.targetLevel) {
      return {
        ok: false,
        session,
        error: {
          code: "INVALID_DOWNGRADE",
          retryable: false,
          message: "Downgrade requires targetLevel",
        },
      };
    }
  }

  const now = meta.now ?? new Date();
  const actor = meta.actor ?? "user";
  const stagedPlan = normalizePlan(changes);

  const next: SessionState = {
    ...session,
    stagedPlan,
    approval: null,
    activityLog: log(session, {
      at: now.toISOString(),
      actor,
      action: "stage",
      targetIds: stagedPlan.map((change) => change.grantId),
      result: "ok",
      profileVersion: session.active.profileVersion,
    }),
  };

  return { ok: true, session: next };
}

export function clearStagedPlan(
  session: SessionState,
  meta: { actor?: ActivityActor; now?: Date } = {},
): MutationResult {
  const now = meta.now ?? new Date();
  const next: SessionState = {
    ...session,
    stagedPlan: [],
    approval: null,
    activityLog: log(session, {
      at: now.toISOString(),
      actor: meta.actor ?? "user",
      action: "clear_plan",
      targetIds: session.stagedPlan.map((change) => change.grantId),
      result: "ok",
      profileVersion: session.active.profileVersion,
    }),
  };
  return { ok: true, session: next };
}

export function approvePlan(
  session: SessionState,
  meta: { now?: Date; actor?: ActivityActor } = {},
): MutationResult {
  if (session.stagedPlan.length === 0) {
    return {
      ok: false,
      session,
      error: {
        code: "NO_PLAN",
        retryable: false,
        message: "Nothing to approve",
      },
    };
  }

  const now = meta.now ?? new Date();
  const planHash = hashPlan(normalizePlan(session.stagedPlan));
  const approval = createApproval({
    profileId: session.active.profileId,
    profileVersion: session.active.profileVersion,
    planHash,
    now,
  });

  return {
    ok: true,
    session: {
      ...session,
      approval,
      activityLog: log(session, {
        at: now.toISOString(),
        actor: meta.actor ?? "user",
        action: "approve",
        targetIds: session.stagedPlan.map((change) => change.grantId),
        result: "ok",
        profileVersion: session.active.profileVersion,
        approvalUsed: approval.id,
      }),
    },
  };
}

export function applyApprovedChanges(
  session: SessionState,
  meta: { approvalId: string; now?: Date; actor?: ActivityActor },
): MutationResult {
  const now = meta.now ?? new Date();

  if (!session.approval || session.approval.id !== meta.approvalId) {
    return {
      ok: false,
      session,
      error: {
        code: "APPROVAL_NOT_FOUND",
        retryable: false,
        message: "No matching approval for this plan",
      },
    };
  }

  const planHash = hashPlan(normalizePlan(session.stagedPlan));
  const validation = validateApproval(session.approval, {
    profileId: session.active.profileId,
    profileVersion: session.active.profileVersion,
    planHash,
    now,
  });

  if (!validation.ok) {
    return { ok: false, session, error: validation.error };
  }

  const simulation = simulateChanges(session.active, session.stagedPlan, {
    now,
  });
  if (!simulation.ok) {
    return {
      ok: false,
      session,
      error: simulation.error ?? {
        code: "SIMULATION_FAILED",
        retryable: false,
        message: "Unable to apply plan",
      },
    };
  }

  const undoSnapshot = structuredClone(session.active);
  const nextActive: ConsentState = {
    ...simulation.projectedState,
    profileVersion: session.active.profileVersion + 1,
  };

  return {
    ok: true,
    session: {
      active: nextActive,
      stagedPlan: [],
      approval: null,
      undoSnapshot,
      activityLog: log(session, {
        at: now.toISOString(),
        actor: meta.actor ?? "agent",
        action: "apply",
        targetIds: session.stagedPlan.map((change) => change.grantId),
        result: "ok",
        profileVersion: nextActive.profileVersion,
        approvalUsed: meta.approvalId,
      }),
    },
  };
}

export function undoLastChange(
  session: SessionState,
  meta: { now?: Date; actor?: ActivityActor } = {},
): MutationResult {
  if (!session.undoSnapshot) {
    return {
      ok: false,
      session,
      error: {
        code: "NOTHING_TO_UNDO",
        retryable: false,
        message: "No applied change to undo",
      },
    };
  }

  const now = meta.now ?? new Date();
  const restored: ConsentState = {
    ...structuredClone(session.undoSnapshot),
    profileVersion: session.active.profileVersion + 1,
  };

  return {
    ok: true,
    session: {
      active: restored,
      stagedPlan: [],
      approval: null,
      undoSnapshot: null,
      activityLog: log(session, {
        at: now.toISOString(),
        actor: meta.actor ?? "user",
        action: "undo",
        targetIds: [],
        result: "ok",
        profileVersion: restored.profileVersion,
      }),
    },
  };
}

export function resetDemoProfile(
  session: SessionState,
  seed: DemoProfile,
  meta: { now?: Date; actor?: ActivityActor } = {},
): MutationResult {
  const now = meta.now ?? new Date();
  const active: ConsentState = {
    profileId: seed.id,
    profileVersion: seed.version + 1,
    personNodeId: seed.personNodeId,
    services: structuredClone(seed.services),
    dataCategories: structuredClone(seed.dataCategories),
    grants: structuredClone(seed.grants),
    shares: structuredClone(seed.shares),
    features: structuredClone(seed.features),
  };

  return {
    ok: true,
    session: {
      active,
      stagedPlan: [],
      approval: null,
      undoSnapshot: null,
      activityLog: log(session, {
        at: now.toISOString(),
        actor: meta.actor ?? "user",
        action: "reset",
        targetIds: [seed.id],
        result: "ok",
        profileVersion: active.profileVersion,
        message: "Demo profile restored from seed",
      }),
    },
  };
}

export function profileToConsentState(profile: DemoProfile): ConsentState {
  return {
    profileId: profile.id,
    profileVersion: profile.version,
    personNodeId: profile.personNodeId,
    services: structuredClone(profile.services),
    dataCategories: structuredClone(profile.dataCategories),
    grants: structuredClone(profile.grants),
    shares: structuredClone(profile.shares),
    features: structuredClone(profile.features),
  };
}
