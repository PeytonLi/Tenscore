import { describe, expect, it } from "vitest";
import { buildConsentGraph } from "./graph";
import type { ConsentState } from "./types";

const state: ConsentState = {
  profileId: "power-user",
  profileVersion: 1,
  personNodeId: "person",
  services: [
    {
      id: "hearthlink",
      name: "Hearthlink",
      purpose: "Home",
      status: "active",
      lastUsedAt: "2026-08-27T00:00:00.000Z",
    },
    {
      id: "roamwise",
      name: "Roamwise",
      purpose: "Travel",
      status: "dormant",
      lastUsedAt: "2025-01-01T00:00:00.000Z",
    },
  ],
  dataCategories: [
    { id: "precise_location", label: "Precise location", sensitivity: 5 },
    { id: "calendar", label: "Calendar", sensitivity: 3 },
  ],
  grants: [
    {
      id: "g-loc",
      serviceId: "hearthlink",
      dataCategoryId: "precise_location",
      level: "background",
      necessity: "useful",
      purpose: "Geofence",
      grantedAt: "2025-01-01T00:00:00.000Z",
      lastUsedAt: "2026-08-27T00:00:00.000Z",
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
  ],
  shares: [
    {
      id: "share-1",
      sourceServiceId: "hearthlink",
      recipientName: "Northwind Analytics",
      dataCategoryId: "precise_location",
      purpose: "Analytics",
    },
  ],
  features: [],
};

describe("buildConsentGraph", () => {
  it("builds person, service, category, and recipient nodes with grant and share edges", () => {
    const graph = buildConsentGraph({ state, stagedPlan: [] });

    expect(graph.nodes.some((n) => n.kind === "person")).toBe(true);
    expect(graph.nodes.some((n) => n.id === "hearthlink")).toBe(true);
    expect(graph.nodes.some((n) => n.id === "precise_location")).toBe(true);
    expect(graph.nodes.some((n) => n.id === "recipient:Northwind Analytics")).toBe(
      true,
    );
    expect(graph.edges.some((e) => e.kind === "share")).toBe(true);
  });

  it("filters to stale grants and marks staged edges as projected", () => {
    const graph = buildConsentGraph({
      state,
      stagedPlan: [{ grantId: "g-cal", action: "revoke" }],
      filter: "stale",
      now: new Date("2026-08-27T00:00:00.000Z"),
    });

    expect(graph.nodes.some((n) => n.id === "roamwise")).toBe(true);
    expect(graph.nodes.some((n) => n.id === "hearthlink")).toBe(false);
    expect(graph.edges.some((e) => e.grantId === "g-cal" && e.inPlan)).toBe(true);
  });

  it("dims unrelated nodes when focus is set", () => {
    const graph = buildConsentGraph({
      state,
      stagedPlan: [],
      focus: { dataCategoryId: "precise_location" },
    });

    const roam = graph.nodes.find((n) => n.id === "roamwise");
    const hearth = graph.nodes.find((n) => n.id === "hearthlink");
    expect(roam?.dimmed).toBe(true);
    expect(hearth?.dimmed).toBe(false);
  });
});
