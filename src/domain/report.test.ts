import { describe, expect, it } from "vitest";
import { buildRedactedReport } from "./report";
import type { ConsentState } from "./types";

const state: ConsentState = {
  profileId: "power-user",
  profileVersion: 3,
  personNodeId: "person",
  services: [
    {
      id: "hearthlink",
      name: "Hearthlink",
      purpose: "Home automation with personal notes",
      status: "active",
      lastUsedAt: "2026-08-27T00:00:00.000Z",
    },
  ],
  dataCategories: [
    { id: "precise_location", label: "Precise location", sensitivity: 5 },
  ],
  grants: [
    {
      id: "g1",
      serviceId: "hearthlink",
      dataCategoryId: "precise_location",
      level: "background",
      necessity: "useful",
      purpose: "Tracks home arrivals at 123 Main St",
      grantedAt: "2025-01-01T00:00:00.000Z",
      lastUsedAt: "2026-08-27T00:00:00.000Z",
      active: true,
    },
  ],
  shares: [
    {
      id: "s1",
      sourceServiceId: "hearthlink",
      recipientName: "Northwind Analytics",
      dataCategoryId: "precise_location",
      purpose: "Detailed behavioral profiling",
    },
  ],
  features: [],
};

describe("buildRedactedReport", () => {
  it("summarizes exposure without raw purpose or street-level text", () => {
    const report = buildRedactedReport(state, {
      now: new Date("2026-08-27T00:00:00.000Z"),
    });

    expect(report.profileId).toBe("power-user");
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.services[0]?.name).toBe("Hearthlink");
    expect(JSON.stringify(report)).not.toMatch(/123 Main St/);
    expect(JSON.stringify(report)).not.toMatch(/behavioral profiling/i);
    expect(report.markdown).toMatch(/Tenscore/);
    expect(report.markdown).toMatch(/redacted/i);
  });
});
