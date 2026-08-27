import { describe, expect, it } from "vitest";
import { buildExposureTimeline } from "./timeline";
import type { ConsentState } from "./types";

const state: ConsentState = {
  profileId: "power-user",
  profileVersion: 1,
  personNodeId: "person",
  services: [
    {
      id: "a",
      name: "A",
      purpose: "A",
      status: "active",
      lastUsedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "b",
      name: "B",
      purpose: "B",
      status: "active",
      lastUsedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  dataCategories: [
    { id: "precise_location", label: "Precise location", sensitivity: 5 },
    { id: "contacts", label: "Contacts", sensitivity: 4 },
  ],
  grants: [
    {
      id: "g-early",
      serviceId: "a",
      dataCategoryId: "contacts",
      level: "read",
      necessity: "useful",
      purpose: "Early",
      grantedAt: "2024-01-01T00:00:00.000Z",
      lastUsedAt: "2026-01-01T00:00:00.000Z",
      active: true,
    },
    {
      id: "g-late",
      serviceId: "b",
      dataCategoryId: "precise_location",
      level: "background",
      necessity: "unused",
      purpose: "Late",
      grantedAt: "2025-06-01T00:00:00.000Z",
      lastUsedAt: "2025-06-01T00:00:00.000Z",
      active: true,
    },
  ],
  shares: [],
  features: [],
};

describe("buildExposureTimeline", () => {
  it("returns chronological frames with cumulative active grants and scores", () => {
    const timeline = buildExposureTimeline(state, {
      now: new Date("2026-08-27T00:00:00.000Z"),
    });

    expect(timeline.length).toBeGreaterThanOrEqual(2);
    expect(timeline[0]?.at <= timeline[1]!.at).toBe(true);
    expect(timeline[0]?.activeGrantIds).toContain("g-early");
    expect(timeline[0]?.activeGrantIds).not.toContain("g-late");
    expect(timeline.at(-1)?.activeGrantIds).toEqual(
      expect.arrayContaining(["g-early", "g-late"]),
    );
    expect(timeline.at(-1)!.score).toBeLessThanOrEqual(timeline[0]!.score);
  });
});
