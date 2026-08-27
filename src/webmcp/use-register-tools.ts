"use client";

import { useEffect } from "react";
import { useRegistrationPhase } from "@/store/tenscore-store";
import { zodToJsonSchema } from "./schemas";
import {
  applySchema,
  emptySchema,
  findingTypesSchema,
  inspectSchema,
  simulateSchema,
  stageSchema,
  traceSchema,
} from "./schemas";
import { executeTool } from "./tools";

type ToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint: boolean;
    untrustedContentHint?: boolean;
  };
};

function toolsForPhase(
  phase: ReturnType<typeof useRegistrationPhase>,
): ToolDef[] {
  const readTools: ToolDef[] = [
    {
      name: "get_consent_overview",
      description:
        "Return Tenscore, profile version, and top finding IDs for the current demo consent state.",
      inputSchema: zodToJsonSchema(emptySchema),
      annotations: { readOnlyHint: true, untrustedContentHint: true },
    },
    {
      name: "find_risky_access",
      description:
        "Rank active permissions by privacy-control risk. Updates visible findings and highlights matching grants.",
      inputSchema: zodToJsonSchema(findingTypesSchema),
      annotations: { readOnlyHint: true, untrustedContentHint: true },
    },
    {
      name: "trace_data_flow",
      description:
        "Return and visibly focus direct and onward paths for a data category or service.",
      inputSchema: zodToJsonSchema(traceSchema),
      annotations: { readOnlyHint: true, untrustedContentHint: true },
    },
    {
      name: "inspect_permission",
      description:
        "Explain one grant, its purpose, dependencies, and risk evidence in the UI.",
      inputSchema: zodToJsonSchema(inspectSchema),
      annotations: { readOnlyHint: true, untrustedContentHint: true },
    },
    {
      name: "simulate_changes",
      description:
        "Preview score and feature effects for proposed permission changes without altering active grants.",
      inputSchema: zodToJsonSchema(simulateSchema),
      annotations: { readOnlyHint: true },
    },
  ];

  if (phase === "approved") {
    return [
      ...readTools,
      {
        name: "clear_staged_plan",
        description: "Remove the staged plan without changing active permissions.",
        inputSchema: zodToJsonSchema(emptySchema),
        annotations: { readOnlyHint: false },
      },
      {
        name: "apply_approved_changes",
        description:
          "Apply the exact staged demo changes approved in the visible Tenscore UI.",
        inputSchema: zodToJsonSchema(applySchema),
        annotations: { readOnlyHint: false },
      },
    ];
  }

  if (phase === "applied") {
    return [
      ...readTools,
      {
        name: "stage_changes",
        description:
          "Replace the editable staged plan and update the visible preview.",
        inputSchema: zodToJsonSchema(stageSchema),
        annotations: { readOnlyHint: false },
      },
      {
        name: "undo_last_change",
        description: "Restore the immediately previous simulated snapshot.",
        inputSchema: zodToJsonSchema(emptySchema),
        annotations: { readOnlyHint: false },
      },
      {
        name: "reset_demo_profile",
        description: "Restore the selected profile seed data.",
        inputSchema: zodToJsonSchema(emptySchema),
        annotations: { readOnlyHint: false },
      },
    ];
  }

  if (phase === "staged") {
    return [
      ...readTools,
      {
        name: "stage_changes",
        description:
          "Replace the editable staged plan and update the visible preview.",
        inputSchema: zodToJsonSchema(stageSchema),
        annotations: { readOnlyHint: false },
      },
      {
        name: "clear_staged_plan",
        description: "Remove the staged plan without changing active permissions.",
        inputSchema: zodToJsonSchema(emptySchema),
        annotations: { readOnlyHint: false },
      },
      {
        name: "reset_demo_profile",
        description: "Restore the selected profile seed data.",
        inputSchema: zodToJsonSchema(emptySchema),
        annotations: { readOnlyHint: false },
      },
    ];
  }

  return [
    ...readTools,
    {
      name: "stage_changes",
      description:
        "Replace the editable staged plan and update the visible preview.",
      inputSchema: zodToJsonSchema(stageSchema),
      annotations: { readOnlyHint: false },
    },
    {
      name: "reset_demo_profile",
      description: "Restore the selected profile seed data.",
      inputSchema: zodToJsonSchema(emptySchema),
      annotations: { readOnlyHint: false },
    },
  ];
}

function getModelContext(): {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations?: Record<string, boolean>;
      execute: (args: unknown) => Promise<string> | string;
    },
    options?: { signal?: AbortSignal },
  ) => Promise<void>;
} | null {
  if (typeof document === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = document as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigator as any;
  return doc.modelContext ?? nav.modelContext ?? null;
}

export function useRegisterTools() {
  const phase = useRegistrationPhase();

  useEffect(() => {
    const modelContext = getModelContext();
    if (!modelContext?.registerTool) return;

    const controller = new AbortController();
    const tools = toolsForPhase(phase);

    void (async () => {
      for (const tool of tools) {
        if (controller.signal.aborted) return;
        try {
          await modelContext.registerTool(
            {
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema,
              annotations: tool.annotations,
              execute: async (args: unknown) => executeTool(tool.name, args),
            },
            { signal: controller.signal },
          );
        } catch {
          // Ignore duplicate-registration races during fast state transitions.
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [phase]);
}
