import { describe, expect, it } from "vitest";
import {
  createApproval,
  hashPlan,
  normalizePlan,
  validateApproval,
} from "./approvals";
import type { PlannedChange } from "./types";

describe("normalizePlan and hashPlan", () => {
  it("produces a stable hash regardless of input order", () => {
    const a: PlannedChange[] = [
      { grantId: "g2", action: "revoke" },
      { grantId: "g1", action: "downgrade", targetLevel: "read" },
    ];
    const b: PlannedChange[] = [
      { grantId: "g1", action: "downgrade", targetLevel: "read" },
      { grantId: "g2", action: "revoke" },
    ];

    expect(hashPlan(normalizePlan(a))).toBe(hashPlan(normalizePlan(b)));
  });
});

describe("approvals", () => {
  const plan: PlannedChange[] = [{ grantId: "g1", action: "revoke" }];
  const planHash = hashPlan(normalizePlan(plan));

  it("accepts a fresh unused approval for the exact plan and version", () => {
    const approval = createApproval({
      profileId: "power-user",
      profileVersion: 3,
      planHash,
      now: new Date("2026-08-27T12:00:00.000Z"),
    });

    const result = validateApproval(approval, {
      profileId: "power-user",
      profileVersion: 3,
      planHash,
      now: new Date("2026-08-27T12:02:00.000Z"),
    });

    expect(result.ok).toBe(true);
  });

  it("fails closed for expired, reused, mismatched, or wrong-version approvals", () => {
    const approval = createApproval({
      profileId: "power-user",
      profileVersion: 3,
      planHash,
      now: new Date("2026-08-27T12:00:00.000Z"),
    });

    const expired = validateApproval(approval, {
      profileId: "power-user",
      profileVersion: 3,
      planHash,
      now: new Date("2026-08-27T12:06:00.000Z"),
    });
    expect(expired.ok).toBe(false);
    if (!expired.ok) expect(expired.error.code).toBe("APPROVAL_EXPIRED");

    const reused = validateApproval(
      { ...approval, usedAt: "2026-08-27T12:01:00.000Z" },
      {
        profileId: "power-user",
        profileVersion: 3,
        planHash,
        now: new Date("2026-08-27T12:02:00.000Z"),
      },
    );
    expect(reused.ok).toBe(false);
    if (!reused.ok) expect(reused.error.code).toBe("APPROVAL_REUSED");

    const mismatch = validateApproval(approval, {
      profileId: "power-user",
      profileVersion: 3,
      planHash: "other",
      now: new Date("2026-08-27T12:02:00.000Z"),
    });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.error.code).toBe("PLAN_MISMATCH");

    const version = validateApproval(approval, {
      profileId: "power-user",
      profileVersion: 4,
      planHash,
      now: new Date("2026-08-27T12:02:00.000Z"),
    });
    expect(version.ok).toBe(false);
    if (!version.ok) expect(version.error.code).toBe("VERSION_MISMATCH");
  });
});
