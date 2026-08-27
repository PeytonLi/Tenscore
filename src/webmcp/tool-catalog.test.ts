import { describe, expect, it } from "vitest";
import { getToolsForPhase } from "./tool-catalog";

describe("getToolsForPhase", () => {
  it("never exposes apply before approval", () => {
    for (const phase of ["no_plan", "staged", "applied"] as const) {
      const names = getToolsForPhase(phase).map((tool) => tool.name);
      expect(names).not.toContain("apply_approved_changes");
    }
  });

  it("exposes apply only while an exact plan is approved", () => {
    const names = getToolsForPhase("approved").map((tool) => tool.name);
    expect(names).toContain("apply_approved_changes");
    expect(names).not.toContain("stage_changes");
    expect(names).toContain("clear_staged_plan");
  });

  it("exposes undo only after apply", () => {
    expect(
      getToolsForPhase("applied").map((tool) => tool.name),
    ).toContain("undo_last_change");
    expect(
      getToolsForPhase("no_plan").map((tool) => tool.name),
    ).not.toContain("undo_last_change");
  });

  it("keeps read tools available in every phase", () => {
    for (const phase of ["no_plan", "staged", "approved", "applied"] as const) {
      const names = getToolsForPhase(phase).map((tool) => tool.name);
      expect(names).toEqual(
        expect.arrayContaining([
          "get_consent_overview",
          "find_risky_access",
          "trace_data_flow",
          "inspect_permission",
          "simulate_changes",
        ]),
      );
    }
  });
});
