import { describe, expect, it } from "vitest";
import { computeTenscore, scoreLabel } from "./scoring";
import type { ConsentState } from "./types";

const baseState: ConsentState = {
  profileId: "test",
  profileVersion: 1,
  personNodeId: "person",
  services: [
    {
      id: "svc-a",
      name: "Service A",
      purpose: "test",
      status: "active",
      lastUsedAt: "2026-08-01T00:00:00.000Z",
    },
  ],
  dataCategories: [
    { id: "precise_location", label: "Precise location", sensitivity: 5 },
    { id: "contacts", label: "Contacts", sensitivity: 4 },
  ],
  grants: [
    {
      id: "g1",
      serviceId: "svc-a",
      dataCategoryId: "precise_location",
      level: "background",
      necessity: "unused",
      purpose: "Unused tracking",
      grantedAt: "2024-01-01T00:00:00.000Z",
      lastUsedAt: "2024-06-01T00:00:00.000Z",
      active: true,
    },
  ],
  shares: [],
  features: [],
};

describe("computeTenscore", () => {
  it("returns a score between 0 and 10 inclusive", () => {
    const result = computeTenscore(baseState, {
      now: new Date("2026-08-27T00:00:00.000Z"),
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(10);
  });

  it("produces the same score for identical state", () => {
    const options = { now: new Date("2026-08-27T00:00:00.000Z") };
    const first = computeTenscore(baseState, options);
    const second = computeTenscore(structuredClone(baseState), options);

    expect(first.score).toBe(second.score);
    expect(first.totalRisk).toBe(second.totalRisk);
    expect(first.contributions).toEqual(second.contributions);
  });

  it("rounds the score to one decimal place", () => {
    const result = computeTenscore(baseState, {
      now: new Date("2026-08-27T00:00:00.000Z"),
    });

    expect(Number.isInteger(result.score * 10)).toBe(true);
  });

  it("does not lower the score when revoking an unused risky grant", () => {
    const options = { now: new Date("2026-08-27T00:00:00.000Z") };
    const before = computeTenscore(baseState, options);
    const afterRevoke = computeTenscore(
      {
        ...baseState,
        grants: baseState.grants.map((grant) =>
          grant.id === "g1" ? { ...grant, active: false } : grant,
        ),
      },
      options,
    );

    expect(afterRevoke.score).toBeGreaterThanOrEqual(before.score);
  });

  it("exposes the factor inputs behind each contribution", () => {
    const result = computeTenscore(baseState, {
      now: new Date("2026-08-27T00:00:00.000Z"),
    });

    expect(result.contributions).toHaveLength(1);
    expect(result.contributions[0]).toMatchObject({
      grantId: "g1",
      factors: {
        sensitivity: 5,
        access: 1.5,
        necessity: 1,
        recency: 1,
        sharing: 1,
      },
    });
  });
});

describe("scoreLabel", () => {
  it("labels low, mid, and high control scores", () => {
    expect(scoreLabel(2)).toBe("High exposure");
    expect(scoreLabel(5.5)).toBe("Needs review");
    expect(scoreLabel(8.5)).toBe("Well minimized");
  });
});
