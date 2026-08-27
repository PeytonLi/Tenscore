"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  buildConsentGraph,
  layoutConsentGraph,
  type GraphFilter,
} from "@/domain/graph";
import { useTenscoreStore } from "@/store/tenscore-store";

type ConsentNodeData = {
  label: string;
  subtitle?: string;
  kind: "person" | "service" | "category" | "recipient";
  severity?: "none" | "review" | "high";
  dimmed: boolean;
  inPlan: boolean;
};

function ConsentNode({ data }: NodeProps) {
  const nodeData = data as ConsentNodeData;
  const base =
    nodeData.kind === "person"
      ? "min-w-[120px] rounded-full border-2 border-teal bg-teal text-white"
      : nodeData.kind === "service"
        ? "min-w-[140px] rounded-2xl border border-border bg-surface"
        : nodeData.kind === "category"
          ? "min-w-[130px] rounded-xl border border-border bg-surface-2"
          : "min-w-[140px] rounded-lg border border-dashed border-warning bg-surface";

  const severityRing =
    nodeData.severity === "high"
      ? "ring-2 ring-danger/50"
      : nodeData.severity === "review"
        ? "ring-2 ring-warning/40"
        : "";

  return (
    <div
      className={`px-3 py-2 text-center shadow-sm transition ${base} ${severityRing} ${
        nodeData.dimmed ? "opacity-30" : "opacity-100"
      } ${nodeData.inPlan ? "outline outline-2 outline-offset-2 outline-teal" : ""}`}
    >
      <p className="text-xs font-semibold">{nodeData.label}</p>
      {nodeData.subtitle ? (
        <p
          className={`mt-0.5 text-[10px] ${
            nodeData.kind === "person" ? "text-teal-soft" : "text-muted"
          }`}
        >
          {nodeData.subtitle}
        </p>
      ) : null}
    </div>
  );
}

const nodeTypes = { consent: ConsentNode };

const FILTERS: Array<{ id: GraphFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "sensitive", label: "Sensitive" },
  { id: "stale", label: "Stale" },
  { id: "shared", label: "Shared" },
  { id: "write", label: "Write access" },
  { id: "in_plan", label: "In plan" },
];

export function ConsentMap() {
  const active = useTenscoreStore((s) => s.active);
  const stagedPlan = useTenscoreStore((s) => s.stagedPlan);
  const focus = useTenscoreStore((s) => s.focus);
  const setSelectedGrantId = useTenscoreStore((s) => s.setSelectedGrantId);
  const graphFilter = useTenscoreStore((s) => s.graphFilter);
  const setGraphFilter = useTenscoreStore((s) => s.setGraphFilter);

  const { nodes, edges } = useMemo(() => {
    const graph = buildConsentGraph({
      state: active,
      stagedPlan,
      focus,
      filter: graphFilter,
      now: new Date(),
    });
    const positions = layoutConsentGraph(graph.nodes);

    const flowNodes: Node[] = graph.nodes.map((node) => ({
      id: node.id,
      type: "consent",
      position: positions.get(node.id) ?? { x: 0, y: 0 },
      data: {
        label: node.label,
        subtitle: node.subtitle,
        kind: node.kind,
        severity: node.severity,
        dimmed: node.dimmed,
        inPlan: node.inPlan,
      } satisfies ConsentNodeData,
      draggable: true,
    }));

    const flowEdges: Edge[] = graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: edge.kind === "projected" || edge.inPlan,
      style: {
        stroke:
          edge.kind === "share"
            ? "#9a6700"
            : edge.kind === "projected"
              ? "#0f766e"
              : "#5c6f6d",
        strokeWidth: edge.inPlan ? 2.5 : 1.5,
        strokeDasharray: edge.kind === "share" || edge.kind === "projected" ? "6 4" : undefined,
        opacity: edge.dimmed ? 0.25 : 1,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color:
          edge.kind === "share"
            ? "#9a6700"
            : edge.kind === "projected"
              ? "#0f766e"
              : "#5c6f6d",
      },
      label: edge.level,
      labelStyle: { fontSize: 10, fill: "#5c6f6d" },
      data: { grantId: edge.grantId },
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }, [active, stagedPlan, focus, graphFilter]);

  return (
    <section className="flex h-[520px] flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-muted uppercase">
            Consent map
          </h2>
          <p className="text-xs text-muted">
            Person → services → data categories → onward recipients
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setGraphFilter(filter.id)}
              className={`rounded-lg px-2 py-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                graphFilter === filter.id
                  ? "bg-teal text-white"
                  : "bg-surface-2 text-muted hover:text-foreground"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.4}
          maxZoom={1.4}
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_, node) => {
            if (node.type !== "consent") return;
            const grantEdge = edges.find(
              (edge) =>
                (edge.source === node.id || edge.target === node.id) &&
                Boolean(edge.data && (edge.data as { grantId?: string }).grantId),
            );
            const grantId = grantEdge?.data
              ? (grantEdge.data as { grantId?: string }).grantId
              : undefined;
            if (grantId) setSelectedGrantId(grantId);
          }}
          onEdgeClick={(_, edge) => {
            const grantId = edge.data
              ? (edge.data as { grantId?: string }).grantId
              : undefined;
            if (grantId) setSelectedGrantId(grantId);
          }}
        >
          <Background gap={18} color="#d9d2c7" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </section>
  );
}
