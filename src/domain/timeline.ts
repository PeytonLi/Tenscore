import { computeTenscore } from "./scoring";
import type { ConsentState } from "./types";

export type TimelineFrame = {
  at: string;
  label: string;
  activeGrantIds: string[];
  score: number;
  serviceCount: number;
};

export function buildExposureTimeline(
  state: ConsentState,
  options: { now?: Date } = {},
): TimelineFrame[] {
  const now = options.now ?? new Date();
  const grants = [...state.grants].sort(
    (a, b) =>
      new Date(a.grantedAt).getTime() - new Date(b.grantedAt).getTime(),
  );

  const frames: TimelineFrame[] = [];
  const activeIds: string[] = [];

  for (const grant of grants) {
    activeIds.push(grant.id);
    const partial: ConsentState = {
      ...state,
      grants: state.grants.map((item) => ({
        ...item,
        active: activeIds.includes(item.id),
      })),
    };
    const score = computeTenscore(partial, {
      now: new Date(grant.grantedAt) > now ? now : now,
    }).score;
    const serviceCount = new Set(
      partial.grants.filter((g) => g.active).map((g) => g.serviceId),
    ).size;

    frames.push({
      at: grant.grantedAt,
      label: `Granted ${grant.id}`,
      activeGrantIds: [...activeIds],
      score,
      serviceCount,
    });
  }

  return frames;
}

export function stateAtTimelineFrame(
  state: ConsentState,
  activeGrantIds: string[],
): ConsentState {
  const activeSet = new Set(activeGrantIds);
  return {
    ...state,
    grants: state.grants.map((grant) => ({
      ...grant,
      active: activeSet.has(grant.id),
    })),
  };
}
