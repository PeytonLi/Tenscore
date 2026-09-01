import { describe, expect, it } from "vitest";
import { DEFAULT_AGENT_POLICY, validatePlanAgainstPolicy } from "./policy";
import type { ConsentState } from "./types";

const state: ConsentState = {
  profileId: "power-user",
  profileVersion: 1,
  personNodeId: "person",
  services: [{ id: "svc", name: "Svc", purpose: "x", status: "active", lastUsedAt: "2026-01-01" }],
  dataCategories: [
    { id: "financial", label: "Financial", sensitivity: 5 },
    { id: "calendar", label: "Calendar", sensitivity: 3 },
  ],
  grants: [
    {
      id: "g-fin",
      serviceId: "svc",
      dataCategoryId: "financial",
      level: "read",
      necessity: "useful",
      purpose: "sync",
      grantedAt: "2025-01-01",
      lastUsedAt: "2026-08-01",
      active: true,
    },
    {
      id: "g-cal",
      serviceId: "svc",
      dataCategoryId: "calendar",
      level: "write",
      necessity: "unused",
      purpose: "sync",
      grantedAt: "2025-01-01",
      lastUsedAt: "2024-01-01",
      active: true,
    },
  ],
  shares: [],
  features: [],
};

describe("validatePlanAgainstPolicy", () => {
  it("blocks changes to blocked categories", () => {
    const result = validatePlanAgainstPolicy(
      state,
      [{ grantId: "g-fin", action: "revoke" }],
      { ...DEFAULT_AGENT_POLICY, blockedCategoryIds: ["financial"] },
      new Date("2026-08-27"),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations[0]).toContain("financial");
    }
  });

  it("allows only stale grants when onlyStale is set", () => {
    const result = validatePlanAgainstPolicy(
      state,
      [{ grantId: "g-fin", action: "revoke" }],
      { ...DEFAULT_AGENT_POLICY, onlyStale: true },
      new Date("2026-08-27"),
    );
    expect(result.ok).toBe(false);
  });
});
