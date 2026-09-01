import { zodToJsonSchema } from "./schemas";
import {
  addServiceSchema,
  applySchema,
  budgetSchema,
  emptySchema,
  findingTypesSchema,
  inspectSchema,
  simulateSchema,
  stageSchema,
  traceSchema,
} from "./schemas";

export type RegistrationPhase = "no_plan" | "staged" | "approved" | "applied";

export type ToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint: boolean;
    untrustedContentHint?: boolean;
  };
};

export function getToolsForPhase(phase: RegistrationPhase): ToolDef[] {
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
    {
      name: "propose_budget_plan",
      description:
        "Propose permission changes to reach a target Tenscore while preserving named features. Optionally stage them.",
      inputSchema: zodToJsonSchema(budgetSchema),
      annotations: { readOnlyHint: false },
    },
    {
      name: "get_redacted_report",
      description:
        "Build a shareable redacted privacy report without raw purpose text.",
      inputSchema: zodToJsonSchema(emptySchema),
      annotations: { readOnlyHint: true, untrustedContentHint: true },
    },
    {
      name: "get_exposure_timeline",
      description:
        "Summarize how exposure grew as grants were added over time.",
      inputSchema: zodToJsonSchema(emptySchema),
      annotations: { readOnlyHint: true },
    },
    {
      name: "get_agent_capabilities",
      description:
        "Return the agent capability contract: available tools, denied tools, lifecycle phase, and what the human must do next.",
      inputSchema: zodToJsonSchema(emptySchema),
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
        name: "add_manual_service",
        description:
          "Add a fictional manual service and grant to the demo profile.",
        inputSchema: zodToJsonSchema(addServiceSchema),
        annotations: { readOnlyHint: false, untrustedContentHint: true },
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
        name: "add_manual_service",
        description:
          "Add a fictional manual service and grant to the demo profile.",
        inputSchema: zodToJsonSchema(addServiceSchema),
        annotations: { readOnlyHint: false, untrustedContentHint: true },
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
      name: "add_manual_service",
      description:
        "Add a fictional manual service and grant to the demo profile.",
      inputSchema: zodToJsonSchema(addServiceSchema),
      annotations: { readOnlyHint: false, untrustedContentHint: true },
    },
    {
      name: "reset_demo_profile",
      description: "Restore the selected profile seed data.",
      inputSchema: zodToJsonSchema(emptySchema),
      annotations: { readOnlyHint: false },
    },
  ];
}
