import { describe, expect, it } from "vitest";
import { buildBlockedAction, explainNextStep } from "./blocked-action";

describe("blocked action", () => {
  it("maps approval not found to human guidance", () => {
    const blocked = buildBlockedAction(
      "apply_approved_changes",
      "APPROVAL_NOT_FOUND",
      "staged",
    );
    expect(blocked.title).toContain("no UI approval");
    expect(blocked.humanAction).toContain("Approve");
  });

  it("explain_next_step prefers blocked human action", () => {
    const blocked = buildBlockedAction(
      "apply_approved_changes",
      "APPLY_UNAVAILABLE",
      "staged",
    );
    const explanation = explainNextStep({ phase: "staged", blocked });
    expect(explanation.humanNextStep).toBe(blocked.humanAction);
  });
});
