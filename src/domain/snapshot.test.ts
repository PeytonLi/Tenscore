import { describe, expect, it } from "vitest";
import {
  exportSnapshot,
  importSnapshot,
  SNAPSHOT_FORMAT_VERSION,
} from "./snapshot";
import type { ConsentState } from "./types";

const state: ConsentState = {
  profileId: "power-user",
  profileVersion: 2,
  personNodeId: "person",
  services: [
    {
      id: "svc",
      name: "Service",
      purpose: "Demo",
      status: "active",
      lastUsedAt: "2026-08-01T00:00:00.000Z",
    },
  ],
  dataCategories: [
    { id: "calendar", label: "Calendar", sensitivity: 3 },
  ],
  grants: [
    {
      id: "g1",
      serviceId: "svc",
      dataCategoryId: "calendar",
      level: "read",
      necessity: "useful",
      purpose: "Sync",
      grantedAt: "2025-01-01T00:00:00.000Z",
      lastUsedAt: "2026-08-01T00:00:00.000Z",
      active: true,
    },
  ],
  shares: [],
  features: [],
};

describe("snapshot import/export", () => {
  it("round-trips active consent state through a versioned snapshot", () => {
    const snapshot = exportSnapshot(state, {
      stagedPlan: [{ grantId: "g1", action: "revoke" }],
      exportedAt: "2026-08-27T12:00:00.000Z",
    });

    expect(snapshot.format).toBe("tenscore-snapshot");
    expect(snapshot.formatVersion).toBe(SNAPSHOT_FORMAT_VERSION);
    expect(snapshot.state.profileId).toBe("power-user");

    const imported = importSnapshot(snapshot);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(imported.state.grants).toEqual(state.grants);
    expect(imported.stagedPlan).toEqual([{ grantId: "g1", action: "revoke" }]);
  });

  it("rejects invalid or unsupported snapshots", () => {
    const bad = importSnapshot({ format: "other", formatVersion: 1 });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("INVALID_SNAPSHOT");
  });
});
