"use client";

import { useEffect } from "react";
import { useRegistrationPhase } from "@/store/tenscore-store";
import { getToolsForPhase } from "./tool-catalog";
import { executeTool } from "./tools";

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
    const tools = getToolsForPhase(phase);

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
