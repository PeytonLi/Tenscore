"use client";

import { isUntrustedSeedText, stripUntrustedMarker } from "@/domain/untrusted";
import { useTenscoreStore } from "@/store/tenscore-store";

export function ServiceList() {
  const active = useTenscoreStore((s) => s.active);
  const selectedGrantId = useTenscoreStore((s) => s.selectedGrantId);
  const setSelectedGrantId = useTenscoreStore((s) => s.setSelectedGrantId);
  const focus = useTenscoreStore((s) => s.focus);

  const selectedGrant = active.grants.find((g) => g.id === selectedGrantId);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-muted uppercase">
        Connected services
      </h2>
      <p className="mt-1 text-sm text-muted">
        Equivalent list view for keyboard users and detail inspection.
      </p>
      <ul className="mt-4 space-y-3">
        {active.services.map((service) => {
          const grants = active.grants.filter(
            (grant) => grant.serviceId === service.id && grant.active,
          );
          const dimmed =
            (focus.serviceId && focus.serviceId !== service.id) ||
            (focus.dataCategoryId &&
              !grants.some((g) => g.dataCategoryId === focus.dataCategoryId));

          return (
            <li
              key={service.id}
              className={`rounded-xl border border-border p-3 transition ${
                dimmed ? "opacity-40" : "bg-surface-2/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{service.name}</h3>
                  <p className="text-xs text-muted">
                    {service.purpose} · {service.status} · last used{" "}
                    {service.lastUsedAt.slice(0, 10)}
                  </p>
                </div>
                <span className="rounded-md bg-surface px-2 py-0.5 text-xs text-muted">
                  {grants.length} grants
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {grants.map((grant) => {
                  const category = active.dataCategories.find(
                    (c) => c.id === grant.dataCategoryId,
                  );
                  const shares = active.shares.filter(
                    (share) =>
                      share.sourceServiceId === service.id &&
                      share.dataCategoryId === grant.dataCategoryId,
                  );
                  const focused =
                    focus.grantIds?.includes(grant.id) ||
                    selectedGrantId === grant.id;
                  return (
                    <li key={grant.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedGrantId(grant.id)}
                        className={`w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-teal-soft/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                          focused ? "bg-teal-soft" : ""
                        }`}
                      >
                        <span className="font-medium">
                          {category?.label ?? grant.dataCategoryId}
                        </span>{" "}
                        · {grant.level} · {grant.necessity}
                        {shares.length > 0
                          ? ` · shared with ${shares.map((s) => s.recipientName).join(", ")}`
                          : ""}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>

      {selectedGrant ? (
        <div className="mt-4 rounded-xl border border-teal/30 bg-teal-soft/50 p-3 text-sm">
          <h3 className="font-semibold">Permission detail</h3>
          {isUntrustedSeedText(selectedGrant.purpose) ? (
            <p className="mt-2 rounded-lg border border-warning/40 bg-warning/10 px-2 py-1.5 text-xs text-warning">
              Untrusted seed content detected — displayed for inspection only, never
              executed as instructions.
            </p>
          ) : null}
          <p className="mt-1 text-muted">
            {stripUntrustedMarker(selectedGrant.purpose)}
          </p>
          <p className="mt-2 font-[family-name:var(--font-mono)] text-xs">
            {selectedGrant.id}
          </p>
          <p className="mt-1 text-xs text-muted">
            Granted {selectedGrant.grantedAt.slice(0, 10)} · last used{" "}
            {selectedGrant.lastUsedAt.slice(0, 10)}
          </p>
        </div>
      ) : null}
    </section>
  );
}
