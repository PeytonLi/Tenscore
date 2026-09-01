import { describe, expect, it } from "vitest";
import { powerUserProfile } from "@/data/profiles";
import { profileToConsentState } from "./mutations";
import { evaluateScenario, scenarioForProfile } from "./scenarios";

describe("scenarios", () => {
  it("finds scenario by profile", () => {
    expect(scenarioForProfile("power-user")?.id).toBe("power-cleanup");
  });

  it("fails when score below target on seed profile", () => {
    const scenario = scenarioForProfile("power-user")!;
    const active = profileToConsentState(powerUserProfile);
    const result = evaluateScenario({ active, stagedPlan: [] }, scenario);
    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(scenario.targetScore);
  });
});
