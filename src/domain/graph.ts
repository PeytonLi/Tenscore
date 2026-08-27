import type { ConsentState, PlannedChange } from "@/domain/types";

export type GraphNodeKind = "person" | "service" | "category" | "recipient";

export type ConsentGraphNode = {
  id: string;
  kind: GraphNodeKind;
  label: string;
  subtitle?: string;
  severity?: "none" | "review" | "high";
  dimmed: boolean;
  inPlan: boolean;
};

export type ConsentGraphEdge = {
  id: string;
  source: string;
  target: string;
  grantId?: string;
  level?: string;
  kind: "grant" | "share" | "projected";
  dimmed: boolean;
  inPlan: boolean;
};

export type GraphFocus = {
  dataCategoryId?: string;
  serviceId?: string;
  grantIds?: string[];
};

export type GraphFilter =
  | "all"
  | "sensitive"
  | "stale"
  | "shared"
  | "write"
  | "in_plan";

function isStale(lastUsedAt: string, now: Date): boolean {
  const days =
    (now.getTime() - new Date(lastUsedAt).getTime()) / (1000 * 60 * 60 * 24);
  return days > 180;
}

export function buildConsentGraph(input: {
  state: ConsentState;
  stagedPlan: PlannedChange[];
  focus?: GraphFocus;
  filter?: GraphFilter;
  now?: Date;
}): { nodes: ConsentGraphNode[]; edges: ConsentGraphEdge[] } {
  const now = input.now ?? new Date();
  const focus = input.focus ?? {};
  const filter = input.filter ?? "all";
  const planGrantIds = new Set(input.stagedPlan.map((change) => change.grantId));

  const activeGrants = input.state.grants.filter((grant) => grant.active);
  const categoryById = new Map(
    input.state.dataCategories.map((category) => [category.id, category]),
  );

  const matchingGrantIds = new Set(
    activeGrants
      .filter((grant) => {
        const category = categoryById.get(grant.dataCategoryId);
        const shares = input.state.shares.filter(
          (share) =>
            share.sourceServiceId === grant.serviceId &&
            share.dataCategoryId === grant.dataCategoryId,
        );
        switch (filter) {
          case "sensitive":
            return (category?.sensitivity ?? 0) >= 4;
          case "stale":
            return isStale(grant.lastUsedAt, now);
          case "shared":
            return shares.length > 0;
          case "write":
            return (
              grant.level === "write" ||
              grant.level === "background" ||
              grant.level === "admin"
            );
          case "in_plan":
            return planGrantIds.has(grant.id);
          default:
            return true;
        }
      })
      .map((grant) => grant.id),
  );

  const focused =
    focus.grantIds?.length || focus.serviceId || focus.dataCategoryId
      ? true
      : false;

  function isGrantFocused(grantId: string, serviceId: string, categoryId: string) {
    if (!focused) return true;
    if (focus.grantIds?.includes(grantId)) return true;
    if (focus.serviceId && focus.serviceId === serviceId) return true;
    if (focus.dataCategoryId && focus.dataCategoryId === categoryId) return true;
    return false;
  }

  const nodes: ConsentGraphNode[] = [
    {
      id: input.state.personNodeId,
      kind: "person",
      label: "You",
      subtitle: input.state.profileId,
      severity: "none",
      dimmed: false,
      inPlan: false,
    },
  ];

  const serviceIds = new Set<string>();
  const categoryIds = new Set<string>();
  const recipientNames = new Set<string>();
  const edges: ConsentGraphEdge[] = [];

  for (const grant of activeGrants) {
    if (!matchingGrantIds.has(grant.id) && filter !== "all") continue;

    const category = categoryById.get(grant.dataCategoryId);
    const inPlan = planGrantIds.has(grant.id);
    const grantFocused = isGrantFocused(
      grant.id,
      grant.serviceId,
      grant.dataCategoryId,
    );
    const dimmed = focused && !grantFocused;
    const severity: ConsentGraphNode["severity"] =
      (category?.sensitivity ?? 0) >= 5 || grant.necessity === "unused"
        ? "high"
        : (category?.sensitivity ?? 0) >= 4
          ? "review"
          : "none";

    serviceIds.add(grant.serviceId);
    categoryIds.add(grant.dataCategoryId);

    edges.push({
      id: `grant-${grant.id}`,
      source: grant.serviceId,
      target: grant.dataCategoryId,
      grantId: grant.id,
      level: grant.level,
      kind: inPlan ? "projected" : "grant",
      dimmed,
      inPlan,
    });

    edges.push({
      id: `person-${grant.serviceId}-${grant.id}`,
      source: input.state.personNodeId,
      target: grant.serviceId,
      grantId: grant.id,
      level: grant.level,
      kind: "grant",
      dimmed,
      inPlan,
    });

    for (const share of input.state.shares) {
      if (
        share.sourceServiceId !== grant.serviceId ||
        share.dataCategoryId !== grant.dataCategoryId
      ) {
        continue;
      }
      recipientNames.add(share.recipientName);
      edges.push({
        id: `share-${share.id}`,
        source: grant.dataCategoryId,
        target: `recipient:${share.recipientName}`,
        grantId: grant.id,
        kind: "share",
        dimmed,
        inPlan,
      });
    }
  }

  for (const service of input.state.services) {
    if (!serviceIds.has(service.id) && filter !== "all") continue;
    if (!serviceIds.has(service.id) && filter === "all") {
      // still show services with no matching filtered grants only for "all"
    }
    const serviceGrants = activeGrants.filter((g) => g.serviceId === service.id);
    if (serviceGrants.length === 0) continue;
    if (filter !== "all" && !serviceGrants.some((g) => matchingGrantIds.has(g.id))) {
      continue;
    }

    const anyFocused = serviceGrants.some((g) =>
      isGrantFocused(g.id, g.serviceId, g.dataCategoryId),
    );

    nodes.push({
      id: service.id,
      kind: "service",
      label: service.name,
      subtitle: service.status,
      severity: serviceGrants.some((g) => g.necessity === "unused")
        ? "high"
        : "review",
      dimmed: focused && !anyFocused,
      inPlan: serviceGrants.some((g) => planGrantIds.has(g.id)),
    });
  }

  for (const category of input.state.dataCategories) {
    if (!categoryIds.has(category.id)) continue;
    const related = activeGrants.filter((g) => g.dataCategoryId === category.id);
    const anyFocused = related.some((g) =>
      isGrantFocused(g.id, g.serviceId, g.dataCategoryId),
    );
    nodes.push({
      id: category.id,
      kind: "category",
      label: category.label,
      subtitle: `sensitivity ${category.sensitivity}`,
      severity:
        category.sensitivity >= 5
          ? "high"
          : category.sensitivity >= 4
            ? "review"
            : "none",
      dimmed: focused && !anyFocused,
      inPlan: related.some((g) => planGrantIds.has(g.id)),
    });
  }

  for (const name of recipientNames) {
    nodes.push({
      id: `recipient:${name}`,
      kind: "recipient",
      label: name,
      subtitle: "Downstream",
      severity: "review",
      dimmed: false,
      inPlan: false,
    });
  }

  // Deduplicate person→service edges (keep first)
  const seen = new Set<string>();
  const dedupedEdges = edges.filter((edge) => {
    if (edge.source === input.state.personNodeId) {
      const key = `${edge.source}->${edge.target}`;
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  });

  return { nodes, edges: dedupedEdges };
}

export function layoutConsentGraph(nodes: ConsentGraphNode[]): Map<
  string,
  { x: number; y: number }
> {
  const positions = new Map<string, { x: number; y: number }>();
  const center = { x: 420, y: 280 };

  const services = nodes.filter((n) => n.kind === "service");
  const categories = nodes.filter((n) => n.kind === "category");
  const recipients = nodes.filter((n) => n.kind === "recipient");

  for (const node of nodes) {
    if (node.kind === "person") {
      positions.set(node.id, center);
    }
  }

  services.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(services.length, 1) - Math.PI / 2;
    positions.set(node.id, {
      x: center.x + Math.cos(angle) * 210,
      y: center.y + Math.sin(angle) * 150,
    });
  });

  categories.forEach((node, index) => {
    const angle =
      (Math.PI * 2 * index) / Math.max(categories.length, 1) - Math.PI / 2;
    positions.set(node.id, {
      x: center.x + Math.cos(angle) * 360,
      y: center.y + Math.sin(angle) * 240,
    });
  });

  recipients.forEach((node, index) => {
    positions.set(node.id, {
      x: 820,
      y: 80 + index * 90,
    });
  });

  return positions;
}
