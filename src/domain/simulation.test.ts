import { describe, expect, it } from "vitest";
import { simulateChanges } from "./simulation";
import type { ConsentState } from "./types";

const now = new Date("2026-08-27T00:00:00.000Z");

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
      id: "ledgerleaf",
      name: "LedgerLeaf",
      purpose: "Budgeting",
      status: "active",
      lastUsedAt: "2026-08-26T00:00:00.000Z",
    },
  ],
  dataCategories: [
    { id: "precise_location", label: "Precise location", sensitivity: 5 },
    { id: "financial", label: "Financial transactions", sensitivity: 5 },
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
    {
      id: "g-fin",
      serviceId: "ledgerleaf",
      dataCategoryId: "financial",
      level: "read",
      necessity: "required",
      purpose: "Sync",
      grantedAt: "2025-02-01T00:00:00.000Z",
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
      id: "feat-routes",
      serviceId: "stepwise",
      featureName: "Live route coaching",
      requiredGrantIds: [],
      degradedGrantIds: ["g-loc"],
    },
  ],
};

describe("simulateChanges", () => {
  it("does not mutate the input state", () => {
    const snapshot = structuredClone(state);
    simulateChanges(
      state,
      [{ grantId: "g-loc", action: "revoke" }],
      { now },
    );
    expect(state).toEqual(snapshot);
  });

  it("returns before/after scores and feature impacts", () => {
    const result = simulateChanges(
      state,
      [{ grantId: "g-loc", action: "downgrade", targetLevel: "read" }],
      { now },
    );

    expect(result.ok).toBe(true);
    expect(result.score.after).toBeGreaterThanOrEqual(result.score.before);
    expect(result.featureImpacts.some((f) => f.featureName === "Live route coaching")).toBe(
      true,
    );
  });

  it("flags preserveFeatures violations without applying changes", () => {
    const result = simulateChanges(
      state,
      [{ grantId: "g-fin", action: "revoke" }],
      { now, preserveFeatures: ["Budget sync"] },
    );

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("FEATURE_CONSTRAINT_VIOLATION");
    expect(result.constraintViolations).toContain("Budget sync");
    expect(state.grants.find((g) => g.id === "g-fin")?.active).toBe(true);
  });

  it("rejects invalid grant or action combinations", () => {
    const missing = simulateChanges(
      state,
      [{ grantId: "missing", action: "revoke" }],
      { now },
    );
    expect(missing.ok).toBe(false);
    expect(missing.error?.code).toBe("INVALID_GRANT");

    const badDowngrade = simulateChanges(
      state,
      [{ grantId: "g-loc", action: "downgrade" }],
      { now },
    );
    expect(badDowngrade.ok).toBe(false);
    expect(badDowngrade.error?.code).toBe("INVALID_DOWNGRADE");
  });
});
