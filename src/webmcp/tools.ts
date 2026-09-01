import { buildCapabilityContract } from "@/domain/capabilities";
import {
  buildBlockedAction,
  explainNextStep,
} from "@/domain/blocked-action";
import { proposePrivacyBudgetPlan } from "@/domain/privacy-budget";
import { buildRedactedReport } from "@/domain/report";
import { buildConsentReceipt } from "@/domain/receipt";
import { buildExposureTimeline } from "@/domain/timeline";
import { deriveFindings, filterFindings } from "@/domain/findings";
import { computeTenscore } from "@/domain/scoring";
import { simulateChanges } from "@/domain/simulation";
import type { PlannedChange } from "@/domain/types";
import { useTenscoreStore } from "@/store/tenscore-store";
import type { RegistrationPhase } from "./tool-catalog";
import {
  addServiceSchema,
  applySchema,
  budgetSchema,
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

function registrationPhase(): RegistrationPhase {
  const { stagedPlan, approval, undoSnapshot } = snapshot();
  if (approval && stagedPlan.length > 0) return "approved";
  if (stagedPlan.length > 0) return "staged";
  if (undoSnapshot) return "applied";
  return "no_plan";
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
      const phase = registrationPhase();
      if (phase !== "approved") {
        const blocked = buildBlockedAction(
          "apply_approved_changes",
          "APPLY_UNAVAILABLE",
          phase,
          now,
        );
        useTenscoreStore.getState().setBlockedAction(blocked);
        return {
          ok: false,
          summary: blocked.title,
          profileVersion: state.active.profileVersion,
          error: { code: "APPLY_UNAVAILABLE", retryable: false },
          nextSuggestedActions: [blocked.humanAction, "explain_next_step"],
        };
      }
      const before = computeTenscore(state.active, { now }).score;
      const error = useTenscoreStore.getState().apply(args.approvalId, "agent");
      const next = snapshot();
      const after = computeTenscore(next.active, { now }).score;
      const blocked = next.blockedAction;
      return {
        ok: !error,
        summary: error ?? `Applied approved plan; score ${before} → ${after}`,
        profileVersion: next.active.profileVersion,
        score: { before, after },
        error: error
          ? {
              code: blocked?.code ?? "APPLY_FAILED",
              retryable: false,
            }
          : undefined,
        nextSuggestedActions: error
          ? [blocked?.humanAction ?? "explain_next_step"]
          : ["undo_last_change"],
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
    case "propose_budget_plan": {
      const args = budgetSchema.parse(rawArgs);
      const proposal = proposePrivacyBudgetPlan(state.active, {
        targetScore: args.targetScore,
        preserveFeatures: args.preserveFeatures,
        now,
      });
      if (args.stage && proposal.changes.length > 0) {
        useTenscoreStore.getState().stage(proposal.changes, "agent");
      }
      return {
        ok: proposal.ok,
        summary: proposal.ok
          ? `Budget plan ${proposal.score.before} → ${proposal.score.after} (${proposal.changes.length} changes)`
          : proposal.error.message,
        profileVersion: snapshot().active.profileVersion,
        score: proposal.score,
        affectedIds: proposal.changes.map((change) => change.grantId),
        nextSuggestedActions: proposal.ok
          ? ["Ask user to review and approve the staged plan"]
          : ["simulate_changes"],
        error: proposal.ok
          ? undefined
          : { code: proposal.error.code, retryable: false },
      };
    }
    case "get_redacted_report": {
      emptySchema.parse(rawArgs ?? {});
      const report = buildRedactedReport(state.active, { now });
      return {
        ok: true,
        summary: `Redacted report score ${report.score} with ${report.findings.length} findings`,
        profileVersion: state.active.profileVersion,
        score: { before: report.score },
        affectedIds: report.findings.map((finding) => finding.grantId),
      };
    }
    case "get_exposure_timeline": {
      emptySchema.parse(rawArgs ?? {});
      const timeline = buildExposureTimeline(state.active, { now });
      const latest = timeline.at(-1);
      return {
        ok: true,
        summary: `Timeline has ${timeline.length} frames; latest score ${latest?.score ?? "n/a"}`,
        profileVersion: state.active.profileVersion,
        score: latest ? { before: latest.score } : undefined,
        affectedIds: latest?.activeGrantIds.slice(0, 8),
      };
    }
    case "get_agent_capabilities": {
      emptySchema.parse(rawArgs ?? {});
      const contract = buildCapabilityContract(registrationPhase());
      return {
        ok: true,
        summary: contract.summary,
        profileVersion: state.active.profileVersion,
        nextSuggestedActions: [contract.humanNextStep],
      };
    }
    case "explain_next_step": {
      emptySchema.parse(rawArgs ?? {});
      const explanation = explainNextStep({
        phase: registrationPhase(),
        blocked: snapshot().blockedAction,
      });
      return {
        ok: true,
        summary: explanation.humanNextStep,
        profileVersion: state.active.profileVersion,
        nextSuggestedActions: explanation.suggestedTools,
      };
    }
    case "get_consent_receipt": {
      emptySchema.parse(rawArgs ?? {});
      const receipt = snapshot().lastReceipt;
      if (!receipt) {
        return {
          ok: false,
          summary: "No consent receipt yet — apply an approved plan first",
          profileVersion: state.active.profileVersion,
          error: { code: "NO_RECEIPT", retryable: false },
        };
      }
      return {
        ok: true,
        summary: `Receipt ${receipt.id}: score ${receipt.scoreBefore.toFixed(1)} → ${receipt.scoreAfter.toFixed(1)}`,
        profileVersion: state.active.profileVersion,
        nextSuggestedActions: ["undo_last_change"],
      };
    }
    case "add_manual_service": {
      const args = addServiceSchema.parse(rawArgs);
      const error = useTenscoreStore.getState().addService({
        name: args.name,
        purpose: args.purpose,
        grants: [
          {
            dataCategoryId: args.dataCategoryId,
            level: args.level ?? "read",
            necessity: args.necessity ?? "useful",
          },
        ],
      });
      return {
        ok: !error,
        summary: error ?? `Added manual service ${args.name}`,
        profileVersion: snapshot().active.profileVersion,
        error: error ? { code: "ADD_SERVICE_FAILED", retryable: false } : undefined,
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
