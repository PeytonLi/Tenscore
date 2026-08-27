import { deriveFindings, filterFindings } from "@/domain/findings";
import { computeTenscore } from "@/domain/scoring";
import { simulateChanges } from "@/domain/simulation";
import type { PlannedChange } from "@/domain/types";
import { useTenscoreStore } from "@/store/tenscore-store";
import {
  applySchema,
  emptySchema,
  findingTypesSchema,
  inspectSchema,
  simulateSchema,
  stageSchema,
  traceSchema,
} from "./schemas";

export type ToolResult = {
  ok: boolean;
  summary: string;
  profileVersion: number;
  affectedIds?: string[];
  score?: { before: number; after?: number };
  nextSuggestedActions?: string[];
  error?: { code: string; retryable: boolean };
};

function truncate(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 1400 ? `${text.slice(0, 1390)}…` : text;
}

function snapshot() {
  return useTenscoreStore.getState();
}

export async function executeTool(
  name: string,
  rawArgs: unknown,
): Promise<string> {
  const started = performance.now();
  let result: ToolResult;

  try {
    result = await runTool(name, rawArgs);
  } catch (error) {
    result = {
      ok: false,
      summary: error instanceof Error ? error.message : "Tool failed",
      profileVersion: snapshot().active.profileVersion,
      error: { code: "TOOL_EXCEPTION", retryable: false },
    };
  }

  // Ensure UI updates flush before the agent receives the result.
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

  useTenscoreStore.getState().recordToolTrace({
    name,
    durationMs: Math.round(performance.now() - started),
    args: rawArgs,
    resultSummary: result.summary,
    ok: result.ok,
  });

  return truncate(result);
}

async function runTool(name: string, rawArgs: unknown): Promise<ToolResult> {
  const state = snapshot();
  const now = new Date();

  switch (name) {
    case "get_consent_overview": {
      emptySchema.parse(rawArgs ?? {});
      const score = computeTenscore(state.active, { now });
      const findings = deriveFindings(state.active, { now }).slice(0, 5);
      return {
        ok: true,
        summary: `Score ${score.score}/10 with ${findings.length} top findings`,
        profileVersion: state.active.profileVersion,
        score: { before: score.score },
        affectedIds: findings.map((f) => f.id),
        nextSuggestedActions: ["find_risky_access", "trace_data_flow"],
      };
    }
    case "find_risky_access": {
      const args = findingTypesSchema.parse(rawArgs);
      const findings = filterFindings(deriveFindings(state.active, { now }), {
        findingTypes: args.findingTypes,
        limit: args.limit ?? 5,
      });
      useTenscoreStore.getState().setFindingFilter(args.findingTypes);
      useTenscoreStore.getState().setFocus({
        grantIds: findings.map((f) => f.grantId),
      });
      return {
        ok: true,
        summary: `Found ${findings.length} risky grants`,
        profileVersion: state.active.profileVersion,
        affectedIds: findings.map((f) => f.grantId),
        nextSuggestedActions: ["inspect_permission", "simulate_changes"],
      };
    }
    case "trace_data_flow": {
      const args = traceSchema.parse(rawArgs);
      const grants = state.active.grants.filter((grant) => {
        if (!grant.active) return false;
        if (args.serviceId && grant.serviceId !== args.serviceId) return false;
        if (args.dataCategory && grant.dataCategoryId !== args.dataCategory) {
          return false;
        }
        return true;
      });
      useTenscoreStore.getState().setFocus({
        dataCategoryId: args.dataCategory,
        serviceId: args.serviceId,
        grantIds: grants.map((g) => g.id),
      });
      const shares = state.active.shares.filter((share) =>
        grants.some(
          (grant) =>
            grant.serviceId === share.sourceServiceId &&
            grant.dataCategoryId === share.dataCategoryId,
        ),
      );
      return {
        ok: true,
        summary: `Traced ${grants.length} grants and ${shares.length} onward shares`,
        profileVersion: state.active.profileVersion,
        affectedIds: [
          ...grants.map((g) => g.id),
          ...shares.map((s) => s.id),
        ],
      };
    }
    case "inspect_permission": {
      const args = inspectSchema.parse(rawArgs);
      const grant = state.active.grants.find((g) => g.id === args.grantId);
      if (!grant) {
        return {
          ok: false,
          summary: "Grant not found",
          profileVersion: state.active.profileVersion,
          error: { code: "INVALID_GRANT", retryable: false },
        };
      }
      useTenscoreStore.getState().setSelectedGrantId(grant.id);
      return {
        ok: true,
        summary: `${grant.id}: ${grant.level}/${grant.necessity} — ${grant.purpose}`,
        profileVersion: state.active.profileVersion,
        affectedIds: [grant.id],
      };
    }
    case "simulate_changes": {
      const args = simulateSchema.parse(rawArgs);
      const simulation = simulateChanges(
        state.active,
        args.changes as PlannedChange[],
        { now, preserveFeatures: args.preserveFeatures },
      );
      return {
        ok: simulation.ok,
        summary: simulation.ok
          ? `Simulation ${simulation.score.before} → ${simulation.score.after}`
          : simulation.error?.message ?? "Simulation failed",
        profileVersion: state.active.profileVersion,
        score: simulation.score,
        affectedIds: args.changes.map((c) => c.grantId),
        error: simulation.error
          ? { code: simulation.error.code, retryable: false }
          : undefined,
        nextSuggestedActions: simulation.ok ? ["stage_changes"] : ["inspect_permission"],
      };
    }
    case "stage_changes": {
      const args = stageSchema.parse(rawArgs);
      const error = useTenscoreStore
        .getState()
        .stage(args.changes as PlannedChange[], "agent");
      const next = snapshot();
      return {
        ok: !error,
        summary: error ?? `Staged ${args.changes.length} changes`,
        profileVersion: next.active.profileVersion,
        affectedIds: args.changes.map((c) => c.grantId),
        nextSuggestedActions: error
          ? ["simulate_changes"]
          : ["Ask user to approve the plan in the UI"],
        error: error
          ? { code: "STAGE_FAILED", retryable: false }
          : undefined,
      };
    }
    case "clear_staged_plan": {
      emptySchema.parse(rawArgs ?? {});
      useTenscoreStore.getState().clearPlan("agent");
      return {
        ok: true,
        summary: "Cleared staged plan",
        profileVersion: snapshot().active.profileVersion,
      };
    }
    case "apply_approved_changes": {
      const args = applySchema.parse(rawArgs);
      const before = computeTenscore(state.active, { now }).score;
      const error = useTenscoreStore.getState().apply(args.approvalId, "agent");
      const next = snapshot();
      const after = computeTenscore(next.active, { now }).score;
      return {
        ok: !error,
        summary: error ?? `Applied approved plan; score ${before} → ${after}`,
        profileVersion: next.active.profileVersion,
        score: { before, after },
        error: error
          ? { code: "APPLY_FAILED", retryable: false }
          : undefined,
        nextSuggestedActions: error ? [] : ["undo_last_change"],
      };
    }
    case "undo_last_change": {
      emptySchema.parse(rawArgs ?? {});
      const error = useTenscoreStore.getState().undo("agent");
      return {
        ok: !error,
        summary: error ?? "Restored previous snapshot",
        profileVersion: snapshot().active.profileVersion,
        error: error
          ? { code: "UNDO_FAILED", retryable: false }
          : undefined,
      };
    }
    case "reset_demo_profile": {
      emptySchema.parse(rawArgs ?? {});
      useTenscoreStore.getState().reset("agent");
      return {
        ok: true,
        summary: "Demo profile reset from seed",
        profileVersion: snapshot().active.profileVersion,
      };
    }
    default:
      return {
        ok: false,
        summary: `Unknown tool ${name}`,
        profileVersion: state.active.profileVersion,
        error: { code: "UNKNOWN_TOOL", retryable: false },
      };
  }
}
