# Tenscore

> See who has your data. Understand why. Take back control.

Tenscore is a visual consent-control workspace for the [WebMCP Challenge](https://webmcp.devpost.com/). A person and a browser agent inspect a simulated personal-data ecosystem, stage a remediation plan, and apply changes only after explicit UI approval.

This is an **interactive simulation** with fictional services and synthetic data. The Tenscore is an explainable heuristic, not a legal, compliance, or security assessment.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- Zustand for client demo state
- Zod-validated WebMCP tool inputs
- Vitest for deterministic domain + agent evals
- Playwright for the judge journey

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
pnpm test          # unit/domain/evals
pnpm test:e2e      # Playwright judge path
pnpm build
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for module boundaries and the safety model.

## Live demo

Production: https://tenscore-two.vercel.app

## WebMCP

Tools register through `document.modelContext.registerTool` with `AbortController` lifecycle cleanup.

**Always-on read/analysis tools:** `get_consent_overview`, `find_risky_access`, `trace_data_flow`, `inspect_permission`, `simulate_changes`, `propose_budget_plan`, `get_redacted_report`, `get_exposure_timeline`

| Phase | Extra tools |
|---|---|
| No plan | `stage_changes`, `add_manual_service`, `reset_demo_profile` |
| Staged | + `clear_staged_plan` |
| Approved in UI | `clear_staged_plan`, `apply_approved_changes` (no stage) |
| After apply | `stage_changes`, `add_manual_service`, `undo_last_change`, `reset_demo_profile` |

### Setup for judges

1. Use ChatGPT’s in-app browser, or Chrome 149+ with WebMCP testing enabled.
2. Open the public HTTPS demo (or localhost).
3. Pick **The Power User**.
4. Prompt: *Find stale or excessive access, trace my precise location, and prepare a cleanup that preserves budgeting and photo backup.*
5. Approve the plan in the UI, then ask the agent to apply it.
6. Use **Reset profile** between judging runs.

## Demo profiles

- **The Power User** — broad active scopes
- **The Forgotten Accounts** — stale unused grants
- **The Minimalist** — fewer services, high-sensitivity onward sharing

## Stretch features

- **Privacy budget** — propose/stage a plan to hit a target score while preserving named features (`propose_budget_plan`)
- **Exposure timeline** — scrub how grants accumulated over time
- **Snapshot import/export** — versioned `tenscore-snapshot` JSON (formatVersion 1)
- **Redacted report** — shareable markdown without raw purpose text
- **Add manual service** — UI form + `add_manual_service` WebMCP tool for fictional services

Real third-party OAuth revocation remains out of scope.

## License

MIT
