import { z } from "zod";
import type { ConsentState, DomainError, PlannedChange } from "./types";

export const SNAPSHOT_FORMAT_VERSION = 1 as const;

const accessLevelSchema = z.enum([
  "metadata",
  "read",
  "write",
  "background",
  "admin",
]);

const grantSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  dataCategoryId: z.string(),
  level: accessLevelSchema,
  necessity: z.enum(["required", "useful", "unused"]),
  purpose: z.string(),
  grantedAt: z.string(),
  lastUsedAt: z.string(),
  active: z.boolean(),
});

const consentStateSchema = z.object({
  profileId: z.string(),
  profileVersion: z.number().int(),
  personNodeId: z.string(),
  services: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      purpose: z.string(),
      status: z.enum(["active", "dormant"]),
      lastUsedAt: z.string(),
    }),
  ),
  dataCategories: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      sensitivity: z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
      ]),
    }),
  ),
  grants: z.array(grantSchema),
  shares: z.array(
    z.object({
      id: z.string(),
      sourceServiceId: z.string(),
      recipientName: z.string(),
      dataCategoryId: z.string(),
      purpose: z.string(),
    }),
  ),
  features: z.array(
    z.object({
      id: z.string(),
      serviceId: z.string(),
      featureName: z.string(),
      requiredGrantIds: z.array(z.string()),
      degradedGrantIds: z.array(z.string()),
    }),
  ),
});

const plannedChangeSchema = z.object({
  grantId: z.string(),
  action: z.enum(["revoke", "downgrade"]),
  targetLevel: accessLevelSchema.optional(),
});

export const tenscoreSnapshotSchema = z.object({
  format: z.literal("tenscore-snapshot"),
  formatVersion: z.literal(SNAPSHOT_FORMAT_VERSION),
  exportedAt: z.string(),
  state: consentStateSchema,
  stagedPlan: z.array(plannedChangeSchema).default([]),
});

export type TenscoreSnapshot = z.infer<typeof tenscoreSnapshotSchema>;

export function exportSnapshot(
  state: ConsentState,
  options: {
    stagedPlan?: PlannedChange[];
    exportedAt?: string;
  } = {},
): TenscoreSnapshot {
  return {
    format: "tenscore-snapshot",
    formatVersion: SNAPSHOT_FORMAT_VERSION,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    state: structuredClone(state),
    stagedPlan: structuredClone(options.stagedPlan ?? []),
  };
}

export type ImportSnapshotResult =
  | { ok: true; state: ConsentState; stagedPlan: PlannedChange[] }
  | { ok: false; error: DomainError };

export function importSnapshot(raw: unknown): ImportSnapshotResult {
  const parsed = tenscoreSnapshotSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "INVALID_SNAPSHOT",
        retryable: false,
        message: "Snapshot failed schema validation",
      },
    };
  }

  return {
    ok: true,
    state: parsed.data.state,
    stagedPlan: parsed.data.stagedPlan,
  };
}
