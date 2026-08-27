"use client";

import { useMemo, useState } from "react";
import { proposePrivacyBudgetPlan } from "@/domain/privacy-budget";
import { buildRedactedReport } from "@/domain/report";
import { exportSnapshot, importSnapshot } from "@/domain/snapshot";
import { buildExposureTimeline } from "@/domain/timeline";
import { useTenscoreStore } from "@/store/tenscore-store";

export function StretchPanel() {
  const active = useTenscoreStore((s) => s.active);
  const stagedPlan = useTenscoreStore((s) => s.stagedPlan);
  const stage = useTenscoreStore((s) => s.stage);
  const importActiveState = useTenscoreStore((s) => s.importActiveState);
  const addService = useTenscoreStore((s) => s.addService);

  const [targetScore, setTargetScore] = useState(8);
  const [preserve, setPreserve] = useState("Budget sync, Photo backup");
  const [budgetMessage, setBudgetMessage] = useState<string | null>(null);
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [serviceName, setServiceName] = useState("");
  const [servicePurpose, setServicePurpose] = useState("");
  const [categoryId, setCategoryId] = useState(
    active.dataCategories[0]?.id ?? "calendar",
  );
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const timeline = useMemo(
    () => buildExposureTimeline(active, { now: new Date() }),
    [active],
  );
  const frame = timeline[Math.min(timelineIndex, Math.max(timeline.length - 1, 0))];

  const report = useMemo(
    () => buildRedactedReport(active, { now: new Date() }),
    [active],
  );

  function runBudget() {
    const preserveFeatures = preserve
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const result = proposePrivacyBudgetPlan(active, {
      targetScore,
      preserveFeatures,
      now: new Date(),
    });
    if (result.ok) {
      const error = stage(result.changes, "user");
      setBudgetMessage(
        error ??
          `Staged ${result.changes.length} changes · ${result.score.before.toFixed(1)} → ${result.score.after.toFixed(1)}`,
      );
    } else {
      setBudgetMessage(result.error.message);
      if (result.changes.length > 0) {
        stage(result.changes, "user");
      }
    }
  }

  function downloadSnapshot() {
    const snapshot = exportSnapshot(active, {
      stagedPlan,
      exportedAt: new Date().toISOString(),
    });
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tenscore-${active.profileId}-v${active.profileVersion}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function onImportFile(file: File | null) {
    if (!file) return;
    void file.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as unknown;
        const imported = importSnapshot(parsed);
        if (!imported.ok) {
          setFormMessage(imported.error.message);
          return;
        }
        importActiveState(imported.state, imported.stagedPlan);
        setFormMessage("Snapshot imported.");
      } catch {
        setFormMessage("Could not parse snapshot JSON.");
      }
    });
  }

  function copyReport() {
    void navigator.clipboard.writeText(report.markdown);
    setFormMessage("Redacted report copied to clipboard.");
  }

  function submitManualService() {
    const error = addService({
      name: serviceName,
      purpose: servicePurpose,
      grants: [
        {
          dataCategoryId: categoryId,
          level: "read",
          necessity: "useful",
        },
      ],
    });
    setFormMessage(error ?? `Added ${serviceName}`);
    if (!error) {
      setServiceName("");
      setServicePurpose("");
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-muted uppercase">
        Stretch tools
      </h2>

      <div className="mt-3 space-y-4 text-sm">
        <div className="rounded-xl bg-surface-2 p-3">
          <h3 className="font-semibold">Privacy budget</h3>
          <p className="mt-1 text-xs text-muted">
            Stage a plan that aims for a target score without breaking named features.
          </p>
          <label className="mt-2 flex items-center gap-2 text-xs">
            Target score
            <input
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={targetScore}
              onChange={(event) => setTargetScore(Number(event.target.value))}
              className="w-20 rounded-lg border border-border bg-surface px-2 py-1"
            />
          </label>
          <label className="mt-2 block text-xs">
            Preserve features (comma-separated)
            <input
              value={preserve}
              onChange={(event) => setPreserve(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-1"
            />
          </label>
          <button
            type="button"
            onClick={runBudget}
            className="mt-2 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white"
          >
            Propose & stage plan
          </button>
          {budgetMessage ? (
            <p className="mt-2 text-xs text-muted">{budgetMessage}</p>
          ) : null}
        </div>

        <div className="rounded-xl bg-surface-2 p-3">
          <h3 className="font-semibold">Exposure timeline</h3>
          {timeline.length === 0 ? (
            <p className="mt-1 text-xs text-muted">No grant history.</p>
          ) : (
            <>
              <input
                type="range"
                min={0}
                max={Math.max(timeline.length - 1, 0)}
                value={Math.min(timelineIndex, timeline.length - 1)}
                onChange={(event) => setTimelineIndex(Number(event.target.value))}
                className="mt-2 w-full"
              />
              {frame ? (
                <p className="mt-2 text-xs text-muted">
                  {frame.at.slice(0, 10)} · score {frame.score.toFixed(1)} ·{" "}
                  {frame.activeGrantIds.length} grants · {frame.serviceCount}{" "}
                  services
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="rounded-xl bg-surface-2 p-3">
          <h3 className="font-semibold">Snapshot import / export</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadSnapshot}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium"
            >
              Export JSON
            </button>
            <label className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium">
              Import JSON
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) =>
                  onImportFile(event.target.files?.[0] ?? null)
                }
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl bg-surface-2 p-3">
          <h3 className="font-semibold">Redacted report</h3>
          <p className="mt-1 text-xs text-muted">
            Score {report.score.toFixed(1)} · {report.findings.length} findings ·
            no raw purpose text
          </p>
          <button
            type="button"
            onClick={copyReport}
            className="mt-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium"
          >
            Copy markdown report
          </button>
        </div>

        <div className="rounded-xl bg-surface-2 p-3">
          <h3 className="font-semibold">Add manual service</h3>
          <p className="mt-1 text-xs text-muted">
            Fictional service only — demonstrates declarative tool/form input.
          </p>
          <input
            value={serviceName}
            onChange={(event) => setServiceName(event.target.value)}
            placeholder="Service name"
            className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1 text-xs"
          />
          <input
            value={servicePurpose}
            onChange={(event) => setServicePurpose(event.target.value)}
            placeholder="Purpose"
            className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1 text-xs"
          />
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1 text-xs"
          >
            {active.dataCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={submitManualService}
            className="mt-2 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white"
          >
            Add service
          </button>
        </div>

        {formMessage ? (
          <p className="text-xs text-teal-deep">{formMessage}</p>
        ) : null}
      </div>
    </section>
  );
}
