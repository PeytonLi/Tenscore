import { describe, expect, it } from "vitest";
import { proposePrivacyBudgetPlan } from "./privacy-budget";
import type { ConsentState } from "./types";

const state: ConsentState = {
  profileId: "power-user",
  profileVersion: 1,
  personNodeId: "person",
  services: [
    {
      id: "stepwise",
      name: "Stepwise",
      purpose: "Fitness",
      status: "active",
      lastUsedAt: "2026-08-20T00:00:00.000Z",
    },
    {
      id: "roamwise",
      name: "Roamwise",
      purpose: "Travel",
      status: "dormant",
      lastUsedAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "ledgerleaf",
      name: "LedgerLeaf",
      purpose: "Budgeting",
      status: "active",
      lastUsedAt: "2026-08-26T00:00:00.000Z",
    },
  ],
  dataCategories: [
    { id: "precise_location", label: "Precise location", sensitivity: 5 },
    { id: "calendar", label: "Calendar", sensitivity: 3 },
    { id: "financial", label: "Financial", sensitivity: 5 },
  ],
  grants: [
    {
      id: "g-loc",
      serviceId: "stepwise",
      dataCategoryId: "precise_location",
      level: "background",
      necessity: "unused",
      purpose: "Routes",
      grantedAt: "2024-01-01T00:00:00.000Z",
      lastUsedAt: "2024-06-01T00:00:00.000Z",
      active: true,
    },
    {
      id: "g-loc-2",
      serviceId: "stepwise",
      dataCategoryId: "precise_location",
      level: "admin",
      necessity: "unused",
      purpose: "Legacy export",
      grantedAt: "2024-02-01T00:00:00.000Z",
      lastUsedAt: "2024-03-01T00:00:00.000Z",
      active: true,
    },
    {
      id: "g-cal",
      serviceId: "roamwise",
      dataCategoryId: "calendar",
      level: "read",
      necessity: "unused",
      purpose: "Trips",
      grantedAt: "2024-01-01T00:00:00.000Z",
      lastUsedAt: "2025-01-01T00:00:00.000Z",
      active: true,
    },
    {
      id: "g-fin",
      serviceId: "ledgerleaf",
      dataCategoryId: "financial",
      level: "read",
      necessity: "required",
      purpose: "Sync",
      grantedAt: "2024-01-01T00:00:00.000Z",
      lastUsedAt: "2026-08-26T00:00:00.000Z",
      active: true,
    },
  ],
  shares: [],
  features: [
    {
      id: "feat-budget",
      serviceId: "ledgerleaf",
      featureName: "Budget sync",
      requiredGrantIds: ["g-fin"],
      degradedGrantIds: [],
    },
    {
      id: "feat-cal",
      serviceId: "roamwise",
      featureName: "Calendar sync",
      requiredGrantIds: ["g-cal"],
      degradedGrantIds: [],
    },
  ],
};

describe("proposePrivacyBudgetPlan", () => {
  it("proposes changes that reach the target score while preserving features", () => {
    const result = proposePrivacyBudgetPlan(state, {
      targetScore: 7.5,
      preserveFeatures: ["Budget sync", "Calendar sync"],
      now: new Date("2026-08-27T00:00:00.000Z"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.score.after).toBeGreaterThanOrEqual(7.5);
    expect(result.changes.every((c) => c.grantId !== "g-cal")).toBe(true);
    expect(result.changes.every((c) => c.grantId !== "g-fin")).toBe(true);
    expect(result.changes.some((c) => c.action === "revoke")).toBe(true);
  });

  it("fails when the budget cannot be met under constraints", () => {
    const result = proposePrivacyBudgetPlan(state, {
      targetScore: 9.9,
      preserveFeatures: ["Budget sync", "Calendar sync"],
      now: new Date("2026-08-27T00:00:00.000Z"),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("BUDGET_UNMET");
  });
});
