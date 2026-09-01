"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ActivityLog } from "@/components/activity/ActivityLog";
import { ConsentMap } from "@/components/consent-map/ConsentMap";
import { FindingsPanel } from "@/components/findings/FindingsPanel";
import { PlanDrawer } from "@/components/plan/PlanDrawer";
import { ScorePanel } from "@/components/score/ScorePanel";
import { ServiceList } from "@/components/services/ServiceList";
import { StretchPanel } from "@/components/stretch/StretchPanel";
import { ToolInspector } from "@/components/tool-inspector/ToolInspector";
import { CapabilityContract } from "@/components/capability/CapabilityContract";
import { CompatibilityBanner } from "@/components/webmcp/CompatibilityBanner";
import { useRegisterTools } from "@/webmcp/use-register-tools";
import { useTenscoreStore } from "@/store/tenscore-store";

function WorkspaceInner() {
  const searchParams = useSearchParams();
  const selectProfile = useTenscoreStore((s) => s.selectProfile);
  const selectedProfileId = useTenscoreStore((s) => s.selectedProfileId);
  const reset = useTenscoreStore((s) => s.reset);
  const undoSnapshot = useTenscoreStore((s) => s.undoSnapshot);
  const undo = useTenscoreStore((s) => s.undo);

  useRegisterTools();

  useEffect(() => {
    const profile = searchParams.get("profile");
    if (profile && profile !== selectedProfileId) {
      selectProfile(profile);
    }
  }, [searchParams, selectProfile, selectedProfileId]);

  return (
    <div
      id="main-content"
      className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 py-4 md:px-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-3" role="banner">
        <div>
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-[0.16em] text-teal uppercase"
          >
            Tenscore
          </Link>
          <p className="mt-1 text-sm text-muted">
            Simulated consent twin · profile{" "}
            <span className="font-medium text-foreground">{selectedProfileId}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {undoSnapshot ? (
            <button
              type="button"
              onClick={() => undo("user")}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium hover:border-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            >
              Undo last apply
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => reset("user")}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium hover:border-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          >
            Reset profile
          </button>
        </div>
      </header>

      <CompatibilityBanner />

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="flex flex-col gap-4">
          <ScorePanel />
          <FindingsPanel />
        </aside>
        <section className="flex min-h-[420px] flex-col gap-4">
          <ConsentMap />
          <ServiceList />
        </section>
        <aside className="flex flex-col gap-4">
          <CapabilityContract />
          <PlanDrawer />
          <StretchPanel />
          <ActivityLog />
          <ToolInspector />
        </aside>
      </div>

      <p className="pb-4 text-xs text-muted">
        Tenscore is an interactive simulation using fictional services and synthetic
        data. Its score is an explainable heuristic, not a legal, compliance, or
        security assessment. Changes affect only this demo profile.
      </p>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted">Loading workspace…</div>}>
      <WorkspaceInner />
    </Suspense>
  );
}
