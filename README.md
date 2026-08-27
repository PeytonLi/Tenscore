# Tenscore

> See who has your data. Understand why. Take back control.

Tenscore is a visual consent-control workspace for the [WebMCP Challenge](https://webmcp.devpost.com/). A person and a browser agent inspect a simulated personal-data ecosystem, stage a remediation plan, and apply changes only after explicit UI approval.

This is an **interactive simulation** with fictional services and synthetic data. The Tenscore is an explainable heuristic, not a legal, compliance, or security assessment.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- Zustand for client demo state
- Zod-validated WebMCP tool inputs
- Vitest for deterministic domain tests

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test
npm run build
```

## WebMCP

Tools register through `document.modelContext.registerTool` with `AbortController` lifecycle cleanup.

| Phase | Tools |
|---|---|
| No plan | read tools + `stage_changes` + `reset_demo_profile` |
| Staged | + `clear_staged_plan` |
| Approved in UI | + `apply_approved_changes` (apply only) |
| After apply | + `undo_last_change` |

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

## Architecture

```text
UI controls ─┐
             ├─> domain/* (pure) ─> Zustand store ─> panels
WebMCP tools ┘
```

Domain modules are covered by unit tests first. UI and WebMCP call the same mutation functions.

## License

MIT
