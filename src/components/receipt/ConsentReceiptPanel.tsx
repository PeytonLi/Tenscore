"use client";

import { useTenscoreStore } from "@/store/tenscore-store";

export function ConsentReceiptPanel() {
  const lastReceipt = useTenscoreStore((s) => s.lastReceipt);

  if (!lastReceipt) return null;

  function copyReceipt() {
    void navigator.clipboard.writeText(lastReceipt!.markdown);
  }

  return (
    <section className="rounded-2xl border border-teal/30 bg-surface p-4">
      <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-muted uppercase">
        Consent receipt
      </h2>
      <p className="mt-1 text-xs text-muted">
        {lastReceipt.id} · applied by {lastReceipt.appliedBy} · score{" "}
        {lastReceipt.scoreBefore.toFixed(1)} → {lastReceipt.scoreAfter.toFixed(1)}
      </p>
      <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-surface-2 p-3 font-[family-name:var(--font-mono)] text-[11px] text-muted whitespace-pre-wrap">
        {lastReceipt.markdown}
      </pre>
      <button
        type="button"
        onClick={copyReceipt}
        className="mt-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium"
      >
        Copy receipt
      </button>
    </section>
  );
}
