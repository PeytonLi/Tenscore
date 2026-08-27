import { describe, expect, it } from "vitest";
import { buildConsentGraph } from "./graph";
import type { ConsentState } from "./types";

const state: ConsentState = {
  profileId: "power-user",
  profileVersion: 1,
  personNodeId: "person",
  services: [
    {
      id: "svc",
      name: "Service",
      purpose: "Demo",
      status: "active",
      lastUsedAt: "2026-08-01T00:00:00.000Z",
    },
  ],
  dataCategories: [
    { id: "calendar", label: "Calendar", sensitivity: 3 },
  ],
  grants: [
    {
      id: "g1",
      serviceId: "svc",
      dataCategoryId: "calendar",
      level: "write",
      necessity: "unused",
      purpose: "Sync",
      grantedAt: "2025-01-01T00:00:00.000Z",
      lastUsedAt: "2025-02-01T00:00:00.000Z",
      active: true,
    },
  ],
  shares: [],
  features: [],
};

describe("projected staged edges", () => {
  it("marks staged grant edges as projected and inPlan", () => {
    const graph = buildConsentGraph({
      state,
      stagedPlan: [{ grantId: "g1", action: "revoke" }],
    });

    const grantEdge = graph.edges.find((edge) => edge.grantId === "g1" && edge.target === "calendar");
    expect(grantEdge?.inPlan).toBe(true);
    expect(grantEdge?.kind).toBe("projected");
  });
});
