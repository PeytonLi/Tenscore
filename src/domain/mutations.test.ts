import { describe, expect, it } from "vitest";
import {
  createApproval,
  hashPlan,
  normalizePlan,
} from "./approvals";
import {
  applyApprovedChanges,
  clearStagedPlan,
  resetDemoProfile,
  stageChanges,
  undoLastChange,
} from "./mutations";
import type { ConsentState, DemoProfile } from "./types";

const seed: DemoProfile = {
  id: "power-user",
  name: "The Power User",
  version: 1,
  personNodeId: "person",
  services: [
    {
      id: "stepwise",
      name: "Stepwise",
      purpose: "Fitness",
      status: "active",
      lastUsedAt: "2026-08-20T00:00:00.000Z",
    },
  ],
  dataCategories: [
    { id: "precise_location", label: "Precise location", sensitivity: 5 },
  ],
  grants: [
    {
      id: "g-loc",
      serviceId: "stepwise",
      dataCategoryId: "precise_location",
      level: "background",
      necessity: "unused",
      purpose: "Routes",
      grantedAt: "2025-01-01T00:00:00.000Z",
      lastUsedAt: "2025-01-15T00:00:00.000Z",
      active: true,
    },
  ],
  shares: [],
  features: [],
};

function activeFrom(profile: DemoProfile): ConsentState {
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

describe("mutations", () => {
  it("stages a plan without changing active grants", () => {
    const session = {
      active: activeFrom(seed),
      stagedPlan: [] as { grantId: string; action: "revoke" | "downgrade" }[],
      approval: null,
      undoSnapshot: null,
      activityLog: [],
    };

    const next = stageChanges(session, [
      { grantId: "g-loc", action: "revoke" },
    ]);

    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.session.stagedPlan).toHaveLength(1);
    expect(next.session.active.grants[0]?.active).toBe(true);
    expect(next.session.approval).toBeNull();
  });

  it("rejects duplicate or conflicting staged changes", () => {
    const session = {
      active: activeFrom(seed),
      stagedPlan: [{ grantId: "g-loc", action: "revoke" as const }],
      approval: null,
      undoSnapshot: null,
      activityLog: [],
    };

    const duplicate = stageChanges(session, [
      { grantId: "g-loc", action: "revoke" },
      { grantId: "g-loc", action: "downgrade", targetLevel: "read" },
    ]);

    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.error.code).toBe("CONFLICTING_CHANGES");
  });

  it("applies atomically with a valid approval and supports one-step undo", () => {
    const now = new Date("2026-08-27T12:00:00.000Z");
    let session = {
      active: activeFrom(seed),
      stagedPlan: [{ grantId: "g-loc", action: "revoke" as const }],
      approval: null as ReturnType<typeof createApproval> | null,
      undoSnapshot: null,
      activityLog: [],
    };

    const planHash = hashPlan(normalizePlan(session.stagedPlan));
    session = {
      ...session,
      approval: createApproval({
        profileId: "power-user",
        profileVersion: 1,
        planHash,
        now,
        id: "apr-1",
      }),
    };

    const applied = applyApprovedChanges(session, {
      approvalId: "apr-1",
      now,
      actor: "agent",
    });

    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.session.active.grants[0]?.active).toBe(false);
    expect(applied.session.active.profileVersion).toBe(2);
    expect(applied.session.stagedPlan).toHaveLength(0);
    expect(applied.session.approval).toBeNull();
    expect(applied.session.undoSnapshot).not.toBeNull();
    expect(applied.session.activityLog[0]?.action).toBe("apply");

    const replay = applyApprovedChanges(applied.session, {
      approvalId: "apr-1",
      now,
      actor: "agent",
    });
    expect(replay.ok).toBe(false);

    const undone = undoLastChange(applied.session, {
      now: new Date("2026-08-27T12:01:00.000Z"),
      actor: "user",
    });
    expect(undone.ok).toBe(true);
    if (!undone.ok) return;
    expect(undone.session.active.grants[0]?.active).toBe(true);
    expect(undone.session.undoSnapshot).toBeNull();
  });

  it("clears staged plans and resets seed state", () => {
    const session = {
      active: {
        ...activeFrom(seed),
        profileVersion: 4,
        grants: seed.grants.map((grant) => ({ ...grant, active: false })),
      },
      stagedPlan: [{ grantId: "g-loc", action: "revoke" as const }],
      approval: createApproval({
        profileId: "power-user",
        profileVersion: 4,
        planHash: "x",
        now: new Date(),
      }),
      undoSnapshot: activeFrom(seed),
      activityLog: [],
    };

    const cleared = clearStagedPlan(session, { actor: "user", now: new Date() });
    expect(cleared.session.stagedPlan).toHaveLength(0);
    expect(cleared.session.approval).toBeNull();

    const reset = resetDemoProfile(cleared.session, seed, {
      actor: "user",
      now: new Date(),
    });
    expect(reset.session.active.grants[0]?.active).toBe(true);
    expect(reset.session.active.profileVersion).toBe(seed.version + 1);
    expect(reset.session.undoSnapshot).toBeNull();
    expect(reset.session.stagedPlan).toHaveLength(0);
  });
});
