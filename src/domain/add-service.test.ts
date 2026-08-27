import { describe, expect, it } from "vitest";
import { addManualService } from "./add-service";
import type { ConsentState } from "./types";

const state: ConsentState = {
  profileId: "power-user",
  profileVersion: 1,
  personNodeId: "person",
  services: [],
  dataCategories: [
    { id: "calendar", label: "Calendar", sensitivity: 3 },
    { id: "files", label: "Files", sensitivity: 3 },
  ],
  grants: [],
  shares: [],
  features: [],
};

describe("addManualService", () => {
  it("adds a fictional service with selected grants and bumps version", () => {
    const result = addManualService(state, {
      name: "Notebookly",
      purpose: "Note sync",
      grants: [
        { dataCategoryId: "calendar", level: "read", necessity: "useful" },
        { dataCategoryId: "files", level: "write", necessity: "unused" },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.profileVersion).toBe(2);
    expect(result.state.services).toHaveLength(1);
    expect(result.state.grants).toHaveLength(2);
    expect(result.state.services[0]?.name).toBe("Notebookly");
  });

  it("rejects unknown categories and empty names", () => {
    const bad = addManualService(state, {
      name: " ",
      purpose: "x",
      grants: [{ dataCategoryId: "calendar", level: "read", necessity: "useful" }],
    });
    expect(bad.ok).toBe(false);

    const unknown = addManualService(state, {
      name: "Ok",
      purpose: "x",
      grants: [{ dataCategoryId: "nope", level: "read", necessity: "useful" }],
    });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.error.code).toBe("UNKNOWN_CATEGORY");
  });
});
