"use client";

import {
  DEFAULT_AGENT_POLICY,
  type AgentPolicy,
} from "@/domain/policy";
import { useTenscoreStore } from "@/store/tenscore-store";

export function AgentPolicyPanel() {
  const agentPolicy = useTenscoreStore((s) => s.agentPolicy);
  const setAgentPolicy = useTenscoreStore((s) => s.setAgentPolicy);
  const active = useTenscoreStore((s) => s.active);

  function toggleOnlyStale() {
    setAgentPolicy({ ...agentPolicy, onlyStale: !agentPolicy.onlyStale });
  }

  function toggleCategory(categoryId: string) {
    const blocked = agentPolicy.blockedCategoryIds.includes(categoryId)
      ? agentPolicy.blockedCategoryIds.filter((id) => id !== categoryId)
      : [...agentPolicy.blockedCategoryIds, categoryId];
    setAgentPolicy({ ...agentPolicy, blockedCategoryIds: blocked });
  }

  function updatePreserve(value: string) {
    const preserveFeatures = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setAgentPolicy({ ...agentPolicy, preserveFeatures });
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-muted uppercase">
        Agent policy
      </h2>
      <p className="mt-1 text-xs text-muted">
        Limits what the agent may stage. Violations are rejected before a plan is saved.
      </p>

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={agentPolicy.onlyStale}
          onChange={toggleOnlyStale}
        />
        Only allow changes to stale grants
      </label>

      <div className="mt-3">
        <p className="text-xs font-semibold text-muted">Blocked categories</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {active.dataCategories.map((category) => (
            <label
              key={category.id}
              className="flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-xs"
            >
              <input
                type="checkbox"
                checked={agentPolicy.blockedCategoryIds.includes(category.id)}
                onChange={() => toggleCategory(category.id)}
              />
              {category.label}
            </label>
          ))}
        </div>
      </div>

      <label className="mt-3 block text-xs">
        Preserve features (comma-separated)
        <input
          value={agentPolicy.preserveFeatures.join(", ")}
          onChange={(event) => updatePreserve(event.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-1 text-sm"
        />
      </label>
    </section>
  );
}

export { DEFAULT_AGENT_POLICY, type AgentPolicy };
