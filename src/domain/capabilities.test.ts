import { describe, expect, it } from "vitest";
import { buildCapabilityContract } from "./capabilities";

describe("buildCapabilityContract", () => {
  it("denies apply before approval", () => {
    const contract = buildCapabilityContract("staged");
    expect(contract.availableTools).not.toContain("apply_approved_changes");
    expect(
      contract.deniedTools.find((t) => t.name === "apply_approved_changes"),
    ).toBeDefined();
  });

  it("allows apply only in approved phase", () => {
    const contract = buildCapabilityContract("approved");
    expect(contract.availableTools).toContain("apply_approved_changes");
    expect(contract.availableTools).not.toContain("stage_changes");
  });

  it("includes get_agent_capabilities in every phase", () => {
    for (const phase of ["no_plan", "staged", "approved", "applied"] as const) {
      const contract = buildCapabilityContract(phase);
      expect(contract.availableTools).toContain("get_agent_capabilities");
    }
  });
});
