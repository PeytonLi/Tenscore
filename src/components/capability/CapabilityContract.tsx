"use client";

import { buildCapabilityContract } from "@/domain/capabilities";
import { useRegistrationPhase } from "@/store/tenscore-store";

export function CapabilityContract() {
  const phase = useRegistrationPhase();
  const contract = buildCapabilityContract(phase);

  return (
    <section className="rounded-2xl border border-teal/30 bg-teal-soft/30 p-4">
      <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-teal-deep uppercase">
        Agent capability contract
      </h2>
      <p className="mt-1 text-xs text-muted">{contract.summary}</p>
      <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-sm text-foreground">
        <span className="font-semibold text-teal-deep">Your move: </span>
        {contract.humanNextStep}
      </p>

      <h3 className="mt-3 text-xs font-semibold tracking-wide text-muted uppercase">
        Available now
      </h3>
      <ul className="mt-1 flex flex-wrap gap-1">
        {contract.availableTools.map((tool) => (
          <li
            key={tool}
            className={`rounded-md px-2 py-0.5 font-[family-name:var(--font-mono)] text-[11px] ${
              tool === "apply_approved_changes"
                ? "bg-teal text-white"
                : "bg-surface text-foreground"
            }`}
          >
            {tool}
          </li>
        ))}
      </ul>

      {contract.deniedTools.length > 0 ? (
        <>
          <h3 className="mt-3 text-xs font-semibold tracking-wide text-muted uppercase">
            Denied
          </h3>
          <ul className="mt-1 max-h-32 space-y-1 overflow-auto text-xs">
            {contract.deniedTools.map((tool) => (
              <li
                key={tool.name}
                className="rounded-lg bg-surface/80 px-2 py-1.5 text-muted"
              >
                <span className="font-[family-name:var(--font-mono)] text-foreground">
                  {tool.name}
                </span>
                <span className="text-muted"> — {tool.reason}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
