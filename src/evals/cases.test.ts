import { describe, expect, it } from "vitest";
import { runEvalCase, EVAL_CASES } from "./cases";
import { powerUserProfile } from "@/data/profiles";

describe("agent eval suite", () => {
  it("covers the PRD eval prompts", () => {
    expect(EVAL_CASES.map((item) => item.id).sort()).toEqual(
      [
        "apply-after-edit",
        "apply-before-approval",
        "budget-preserve",
        "remove-risky-safely",
        "seed-injection",
        "stale-review",
        "trace-location",
        "undo-cleanup",
      ].sort(),
    );
  });

  it("passes every scripted eval against the power-user profile", () => {
    for (const evalCase of EVAL_CASES) {
      const result = runEvalCase(evalCase, powerUserProfile);
      expect(result, `${evalCase.id}: ${result.failures.join("; ")}`).toEqual({
        ok: true,
        failures: [],
        toolTrace: expect.any(Array),
      });
    }
  });
});
