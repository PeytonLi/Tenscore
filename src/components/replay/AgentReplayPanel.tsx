"use client";

import { useCallback, useRef } from "react";
import {
  POWER_USER_REPLAY,
  type ReplayStatus,
} from "@/domain/replay";
import { useTenscoreStore } from "@/store/tenscore-store";
import { executeTool } from "@/webmcp/tools";

const STEP_DELAY_MS = 900;

export function AgentReplayPanel() {
  const replayStatus = useTenscoreStore((s) => s.replayStatus);
  const replayStepIndex = useTenscoreStore((s) => s.replayStepIndex);
  const setReplayState = useTenscoreStore((s) => s.setReplayState);
  const approval = useTenscoreStore((s) => s.approval);
  const runningRef = useRef(false);

  const runFrom = useCallback(
    async (startIndex: number) => {
      if (runningRef.current) return;
      runningRef.current = true;
      setReplayState({ replayStatus: "running", replayStepIndex: startIndex });

      for (let index = startIndex; index < POWER_USER_REPLAY.length; index += 1) {
        const step = POWER_USER_REPLAY[index]!;
        setReplayState({ replayStepIndex: index });

        if (step.type === "wait_approval") {
          setReplayState({ replayStatus: "waiting_approval", replayStepIndex: index });
          runningRef.current = false;
          return;
        }

        const args =
          step.name === "apply_approved_changes"
            ? { approvalId: useTenscoreStore.getState().approval?.id ?? "" }
            : (step.args ?? {});

        await executeTool(step.name, args);
        await new Promise((resolve) => setTimeout(resolve, STEP_DELAY_MS));
      }

      setReplayState({ replayStatus: "done", replayStepIndex: POWER_USER_REPLAY.length });
      runningRef.current = false;
    },
    [setReplayState],
  );

  function startReplay() {
    void runFrom(0);
  }

  function resumeAfterApproval() {
    if (!approval) return;
    const waitIndex = POWER_USER_REPLAY.findIndex(
      (step) => step.type === "wait_approval",
    );
    void runFrom(waitIndex + 1);
  }

  function resetReplay() {
    setReplayState({ replayStatus: "idle", replayStepIndex: 0 });
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-muted uppercase">
        Demo agent replay
      </h2>
      <p className="mt-1 text-xs text-muted">
        Runs the judge journey without WebMCP. Stops at approval so you can click
        Approve, then resume.
      </p>
      <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-teal-deep">
        Status: {replayStatus} · step {replayStepIndex + 1}/{POWER_USER_REPLAY.length}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={startReplay}
          disabled={replayStatus === "running"}
          className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          Run demo agent
        </button>
        {replayStatus === "waiting_approval" ? (
          <button
            type="button"
            onClick={resumeAfterApproval}
            disabled={!approval}
            className="rounded-lg border border-teal bg-teal-soft px-3 py-1.5 text-xs font-semibold text-teal-deep disabled:opacity-50"
          >
            Resume after approval
          </button>
        ) : null}
        {replayStatus !== "idle" ? (
          <button
            type="button"
            onClick={resetReplay}
            className="rounded-lg border border-border px-3 py-1.5 text-xs"
          >
            Reset replay
          </button>
        ) : null}
      </div>
    </section>
  );
}

export type { ReplayStatus };
