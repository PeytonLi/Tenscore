"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addManualService, type AddManualServiceInput } from "@/domain/add-service";
import { DEMO_PROFILES, getProfile } from "@/data/profiles";
import { hashPlan, normalizePlan } from "@/domain/approvals";
import { deriveFindings } from "@/domain/findings";
import {
  applyApprovedChanges,
  approvePlan,
  clearStagedPlan,
  profileToConsentState,
  resetDemoProfile,
  stageChanges,
  undoLastChange,
  type ActivityEntry,
  type SessionState,
} from "@/domain/mutations";
import { computeTenscore, scoreLabel } from "@/domain/scoring";
import { simulateChanges } from "@/domain/simulation";
import type {
  ConsentState,
  FindingType,
  PlannedChange,
} from "@/domain/types";
import type { GraphFilter } from "@/domain/graph";

export type FocusState = {
  dataCategoryId?: string;
  serviceId?: string;
  grantIds?: string[];
};

type TenscoreStore = SessionState & {
  selectedProfileId: string;
  selectedGrantId: string | null;
  focus: FocusState;
  findingFilter: FindingType[] | "all";
  graphFilter: GraphFilter;
  toolTrace: Array<{
    id: string;
    name: string;
    at: string;
    durationMs: number;
    args: unknown;
    resultSummary: string;
    ok: boolean;
  }>;
  selectProfile: (profileId: string) => void;
  setSelectedGrantId: (grantId: string | null) => void;
  setFocus: (focus: FocusState) => void;
  setFindingFilter: (filter: FindingType[] | "all") => void;
  setGraphFilter: (filter: GraphFilter) => void;
  stage: (changes: PlannedChange[], actor?: "user" | "agent") => string | null;
  clearPlan: (actor?: "user" | "agent") => void;
  approve: () => string | null;
  apply: (approvalId: string, actor?: "user" | "agent") => string | null;
  undo: (actor?: "user" | "agent") => string | null;
  reset: (actor?: "user" | "agent") => void;
  importActiveState: (
    state: ConsentState,
    stagedPlan?: PlannedChange[],
  ) => void;
  addService: (input: AddManualServiceInput) => string | null;
  recordToolTrace: (entry: {
    name: string;
    durationMs: number;
    args: unknown;
    resultSummary: string;
    ok: boolean;
  }) => void;
};

function freshSession(profileId: string): SessionState {
  const profile = getProfile(profileId) ?? DEMO_PROFILES[0]!;
  return {
    active: profileToConsentState(profile),
    stagedPlan: [],
    approval: null,
    undoSnapshot: null,
    activityLog: [],
  };
}

export const useTenscoreStore = create<TenscoreStore>()(
  persist(
    (set, get) => ({
      ...freshSession("power-user"),
      selectedProfileId: "power-user",
      selectedGrantId: null,
      focus: {},
      findingFilter: "all",
      graphFilter: "all",
      toolTrace: [],

      selectProfile: (profileId) => {
        set({
          ...freshSession(profileId),
          selectedProfileId: profileId,
          selectedGrantId: null,
          focus: {},
          findingFilter: "all",
          graphFilter: "all",
        });
      },

      setSelectedGrantId: (grantId) => set({ selectedGrantId: grantId }),
      setFocus: (focus) => set({ focus }),
      setFindingFilter: (filter) => set({ findingFilter: filter }),
      setGraphFilter: (filter) => set({ graphFilter: filter }),

      stage: (changes, actor = "user") => {
        const result = stageChanges(get(), changes, { actor, now: new Date() });
        set({ ...result.session });
        return result.ok ? null : result.error.message;
      },

      clearPlan: (actor = "user") => {
        const result = clearStagedPlan(get(), { actor, now: new Date() });
        set({ ...result.session });
      },

      approve: () => {
        const result = approvePlan(get(), { actor: "user", now: new Date() });
        set({ ...result.session });
        return result.ok ? result.session.approval!.id : result.error.message;
      },

      apply: (approvalId, actor = "agent") => {
        const result = applyApprovedChanges(get(), {
          approvalId,
          actor,
          now: new Date(),
        });
        set({ ...result.session });
        return result.ok ? null : result.error.message;
      },

      undo: (actor = "user") => {
        const result = undoLastChange(get(), { actor, now: new Date() });
        set({ ...result.session });
        return result.ok ? null : result.error.message;
      },

      reset: (actor = "user") => {
        const profile =
          getProfile(get().selectedProfileId) ?? DEMO_PROFILES[0]!;
        const result = resetDemoProfile(get(), profile, {
          actor,
          now: new Date(),
        });
        set({
          ...result.session,
          selectedGrantId: null,
          focus: {},
        });
      },

      importActiveState: (state, stagedPlan = []) => {
        set({
          active: structuredClone(state),
          stagedPlan: structuredClone(stagedPlan),
          approval: null,
          undoSnapshot: null,
          selectedGrantId: null,
          focus: {},
          activityLog: [
            {
              id: `log_import_${Date.now()}`,
              at: new Date().toISOString(),
              actor: "user",
              action: "reset",
              targetIds: [state.profileId],
              result: "ok",
              profileVersion: state.profileVersion,
              message: "Imported Tenscore snapshot",
            },
            ...get().activityLog,
          ],
        });
      },

      addService: (input) => {
        const result = addManualService(get().active, {
          ...input,
          now: new Date(),
        });
        if (!result.ok) return result.error.message;
        set({
          active: result.state,
          approval: null,
          activityLog: [
            {
              id: `log_add_${Date.now()}`,
              at: new Date().toISOString(),
              actor: "user",
              action: "stage",
              targetIds: [result.serviceId, ...result.grantIds],
              result: "ok",
              profileVersion: result.state.profileVersion,
              message: `Added manual service ${input.name}`,
            },
            ...get().activityLog,
          ],
        });
        return null;
      },

      recordToolTrace: (entry) => {
        set({
          toolTrace: [
            {
              id: `trace_${Date.now()}`,
              at: new Date().toISOString(),
              ...entry,
            },
            ...get().toolTrace,
          ].slice(0, 40),
        });
      },
    }),
    {
      name: "tenscore-demo",
      partialize: (state) => ({
        selectedProfileId: state.selectedProfileId,
        active: state.active,
        stagedPlan: state.stagedPlan,
        approval: state.approval,
        undoSnapshot: state.undoSnapshot,
        activityLog: state.activityLog,
      }),
    },
  ),
);

export function useScoreView() {
  const active = useTenscoreStore((s) => s.active);
  const stagedPlan = useTenscoreStore((s) => s.stagedPlan);
  const now = new Date();
  const current = computeTenscore(active, { now });
  const simulation =
    stagedPlan.length > 0
      ? simulateChanges(active, stagedPlan, { now })
      : null;

  return {
    score: current.score,
    label: scoreLabel(current.score),
    factors: current.factors,
    contributions: current.contributions,
    projectedScore: simulation?.score.after,
    simulation,
  };
}

export function useFindingsView() {
  const active = useTenscoreStore((s) => s.active);
  const findingFilter = useTenscoreStore((s) => s.findingFilter);
  const findings = deriveFindings(active, { now: new Date() });
  if (findingFilter === "all") return findings;
  return findings.filter((finding) =>
    finding.types.some((type) => findingFilter.includes(type)),
  );
}

export function usePlanHash() {
  const stagedPlan = useTenscoreStore((s) => s.stagedPlan);
  return hashPlan(normalizePlan(stagedPlan));
}

export function useRegistrationPhase():
  | "no_plan"
  | "staged"
  | "approved"
  | "applied" {
  const stagedPlan = useTenscoreStore((s) => s.stagedPlan);
  const approval = useTenscoreStore((s) => s.approval);
  const undoSnapshot = useTenscoreStore((s) => s.undoSnapshot);

  if (approval && stagedPlan.length > 0) return "approved";
  if (stagedPlan.length > 0) return "staged";
  if (undoSnapshot) return "applied";
  return "no_plan";
}

export type { ActivityEntry };
