import { describe, expect, it } from "vitest";
import { buildConsentReceipt } from "./receipt";
import type { ConsentState } from "./types";

const state: ConsentState = {
  profileId: "power-user",
  profileVersion: 1,
  personNodeId: "person",
  services: [],
  dataCategories: [],
  grants: [],
  shares: [],
  features: [],
};

describe("buildConsentReceipt", () => {
  it("includes approval and score metadata", () => {
    const receipt = buildConsentReceipt({
      before: state,
      after: { ...state, profileVersion: 2 },
      approval: {
        id: "apr_1",
        profileId: "power-user",
        profileVersion: 1,
        planHash: "plan_x",
        expiresAt: "2026-01-01T00:00:00.000Z",
      },
      appliedBy: "agent",
      changes: [],
      scoreBefore: 6.2,
      scoreAfter: 7.8,
    });
    expect(receipt.markdown).toContain("apr_1");
    expect(receipt.scoreAfter).toBe(7.8);
  });
});
