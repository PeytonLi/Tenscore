# Architecture

Tenscore is a client-side consent “digital twin.” UI controls and WebMCP tools call the same pure domain functions; the Zustand store holds demo session state.

```text
UI panels / buttons ─┐
                     ├─► domain/* ─► SessionState ─► selectors ─► React panels
WebMCP tool execute ─┘

getToolsForPhase(phase) ─► document.modelContext.registerTool(..., { signal })
```

## Domain modules

| Module | Responsibility |
|---|---|
| `scoring.ts` | Deterministic Tenscore heuristic |
| `findings.ts` | Sensitive / excessive / stale / shared findings |
| `simulation.ts` | Counterfactual score + feature impact |
| `approvals.ts` | Plan hash + short-lived single-use approval |
| `mutations.ts` | Stage / approve / apply / undo / reset |
| `graph.ts` | Consent map node/edge projection |
| `privacy-budget.ts` | Target-score planner under feature constraints |
| `snapshot.ts` | Versioned JSON import/export |
| `timeline.ts` | Exposure growth frames |
| `report.ts` | Redacted shareable report |
| `add-service.ts` | Manual fictional service creation |

## Safety model

- `apply_approved_changes` is registered only after an explicit UI approval.
- Approval binds profile id, profile version, plan hash, and 5-minute expiry.
- Editing a staged plan clears approval and unregisters apply.
- Seed/service text is returned with `untrustedContentHint` and never treated as instructions.

## Testing

```bash
pnpm test          # Vitest domain + evals + tool catalog
pnpm test:e2e      # Playwright judge journey
pnpm test:evals    # Alias to eval-focused Vitest run
```

Agent evals in `src/evals/` are scripted tool-chain fixtures (deterministic). They do not call a live LLM.
