import type { GrantDiff } from "./diff";
import type { Approval, ConsentState } from "./types";

export type ConsentReceipt = {
  id: string;
  at: string;
  profileId: string;
  profileVersionBefore: number;
  profileVersionAfter: number;
  approvalId: string;
  planHash: string;
  approvedBy: "user";
  appliedBy: "user" | "agent";
  scoreBefore: number;
  scoreAfter: number;
  changes: GrantDiff[];
  markdown: string;
};

export function buildConsentReceipt(input: {
  before: ConsentState;
  after: ConsentState;
  approval: Approval;
  appliedBy: "user" | "agent";
  changes: GrantDiff[];
  scoreBefore: number;
  scoreAfter: number;
  at?: Date;
}): ConsentReceipt {
  const at = (input.at ?? new Date()).toISOString();
  const id = `rcpt_${at.replace(/[:.]/g, "")}`;

  const lines = [
    "# Tenscore consent receipt",
    "",
    `- Receipt: ${id}`,
    `- Applied at: ${at}`,
    `- Profile: ${input.after.profileId} (v${input.before.profileVersion} → v${input.after.profileVersion})`,
    `- Approval: ${input.approval.id}`,
    `- Plan hash: ${input.approval.planHash}`,
    `- Approved by: user · Applied by: ${input.appliedBy}`,
    `- Score: ${input.scoreBefore.toFixed(1)} → ${input.scoreAfter.toFixed(1)}`,
    "",
    "## Changes",
    "",
    ...input.changes.map(
      (change) =>
        `- **${change.serviceName}** (${change.categoryLabel}): ${change.before} → ${change.after}`,
    ),
    "",
    "_Simulated demo receipt — not a legal record._",
  ];

  return {
    id,
    at,
    profileId: input.after.profileId,
    profileVersionBefore: input.before.profileVersion,
    profileVersionAfter: input.after.profileVersion,
    approvalId: input.approval.id,
    planHash: input.approval.planHash,
    approvedBy: "user",
    appliedBy: input.appliedBy,
    scoreBefore: input.scoreBefore,
    scoreAfter: input.scoreAfter,
    changes: input.changes,
    markdown: lines.join("\n"),
  };
}
