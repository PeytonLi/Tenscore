import { describe, expect, it } from "vitest";
import { buildPlanDiff } from "./diff";
import type { ConsentState } from "./types";

const state: ConsentState = {
  profileId: "power-user",
  profileVersion: 1,
  personNodeId: "person",
  services: [{ id: "svc", name: "Stepwise", purpose: "Fitness", status: "active", lastUsedAt: "2026-01-01" }],
  dataCategories: [{ id: "precise_location", label: "Precise location", sensitivity: 5 }],
  grants: [
    {
      id: "g1",
      serviceId: "svc",
      dataCategoryId: "precise_location",
      level: "background",
      necessity: "unused",
      purpose: "Routes",
      grantedAt: "2025-01-01",
      lastUsedAt: "2025-01-15",
      active: true,
    },
  ],
  shares: [],
  features: [],
};

describe("buildPlanDiff", () => {
  it("describes revoke changes", () => {
    const diff = buildPlanDiff(state, [{ grantId: "g1", action: "revoke" }]);
    expect(diff[0]?.after).toBe("revoked");
    expect(diff[0]?.serviceName).toBe("Stepwise");
  });
});
