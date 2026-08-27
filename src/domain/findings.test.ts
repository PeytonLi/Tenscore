import { describe, expect, it } from "vitest";
import { deriveFindings, filterFindings } from "./findings";
import type { ConsentState } from "./types";

const now = new Date("2026-08-27T00:00:00.000Z");

const state: ConsentState = {
  profileId: "power-user",
  profileVersion: 1,
  personNodeId: "person",
  services: [
    {
      id: "roamwise",
      name: "Roamwise",
      purpose: "Trip planning",
      status: "dormant",
      lastUsedAt: "2025-06-01T00:00:00.000Z",
    },
    {
      id: "stepwise",
      name: "Stepwise",
      purpose: "Fitness coaching",
      status: "active",
      lastUsedAt: "2026-08-20T00:00:00.000Z",
    },
    {
      id: "hearthlink",
      name: "Hearthlink",
      purpose: "Smart-home controls",
      status: "active",
      lastUsedAt: "2026-08-25T00:00:00.000Z",
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
    { id: "financial", label: "Financial transactions", sensitivity: 5 },
  ],
  grants: [
    {
      id: "g-stale",
      serviceId: "roamwise",
      dataCategoryId: "calendar",
      level: "read",
      necessity: "unused",
      purpose: "Trip reminders",
      grantedAt: "2024-01-01T00:00:00.000Z",
      lastUsedAt: "2025-06-01T00:00:00.000Z",
      active: true,
    },
    {
      id: "g-excessive",
      serviceId: "stepwise",
      dataCategoryId: "precise_location",
      level: "background",
      necessity: "unused",
      purpose: "Route coaching",
      grantedAt: "2025-01-01T00:00:00.000Z",
      lastUsedAt: "2026-08-01T00:00:00.000Z",
      active: true,
    },
    {
      id: "g-shared",
      serviceId: "hearthlink",
      dataCategoryId: "precise_location",
      level: "background",
      necessity: "useful",
      purpose: "Geofenced automations",
      grantedAt: "2025-03-01T00:00:00.000Z",
      lastUsedAt: "2026-08-25T00:00:00.000Z",
      active: true,
    },
    {
      id: "g-required",
      serviceId: "ledgerleaf",
      dataCategoryId: "financial",
      level: "read",
      necessity: "required",
      purpose: "Transaction sync",
      grantedAt: "2025-02-01T00:00:00.000Z",
      lastUsedAt: "2026-08-26T00:00:00.000Z",
      active: true,
    },
  ],
  shares: [
    {
      id: "share-1",
      sourceServiceId: "hearthlink",
      recipientName: "Northwind Analytics",
      dataCategoryId: "precise_location",
      purpose: "Usage analytics",
    },
  ],
  features: [
    {
      id: "feat-budget",
      serviceId: "ledgerleaf",
      featureName: "Budget sync",
      requiredGrantIds: ["g-required"],
      degradedGrantIds: [],
    },
  ],
};

describe("deriveFindings", () => {
  it("flags stale, excessive, shared, and sensitive grants with evidence", () => {
    const findings = deriveFindings(state, { now });

    expect(findings.map((f) => f.grantId).sort()).toEqual(
      ["g-excessive", "g-required", "g-shared", "g-stale"].sort(),
    );

    const stale = findings.find((f) => f.grantId === "g-stale");
    expect(stale?.types).toContain("stale");
    expect(stale?.evidence.lastUsedAt).toBe("2025-06-01T00:00:00.000Z");

    const excessive = findings.find((f) => f.grantId === "g-excessive");
    expect(excessive?.types).toContain("excessive");
    expect(excessive?.types).toContain("sensitive");

    const shared = findings.find((f) => f.grantId === "g-shared");
    expect(shared?.types).toContain("shared");
    expect(shared?.evidence.downstreamRecipients).toContain(
      "Northwind Analytics",
    );
  });

  it("warns before recommending revoke on a required permission", () => {
    const findings = deriveFindings(state, { now });
    const required = findings.find((f) => f.grantId === "g-required");

    expect(required?.recommendedAction).toBe("keep");
    expect(required?.featureLossWarning).toMatch(/Budget sync/i);
  });

  it("ranks findings by estimated score impact descending", () => {
    const findings = deriveFindings(state, { now });
    const impacts = findings.map((f) => f.estimatedScoreImpact);
    expect(impacts).toEqual([...impacts].sort((a, b) => b - a));
  });
});

describe("filterFindings", () => {
  it("filters by finding type and limit", () => {
    const findings = deriveFindings(state, { now });
    const staleOnly = filterFindings(findings, {
      findingTypes: ["stale"],
      limit: 10,
    });

    expect(staleOnly.every((f) => f.types.includes("stale"))).toBe(true);
    expect(staleOnly.length).toBeGreaterThan(0);

    const limited = filterFindings(findings, {
      findingTypes: ["sensitive", "excessive", "stale", "shared"],
      limit: 2,
    });
    expect(limited).toHaveLength(2);
  });
});
