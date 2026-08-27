import { deriveFindings } from "./findings";
import { computeTenscore, scoreLabel } from "./scoring";
import type { ConsentState } from "./types";

export type RedactedReport = {
  generatedAt: string;
  profileId: string;
  profileVersion: number;
  score: number;
  label: string;
  disclosure: string;
  services: Array<{
    id: string;
    name: string;
    status: string;
    activeGrantCount: number;
    categories: string[];
    onwardRecipientCount: number;
  }>;
  findings: Array<{
    grantId: string;
    types: string[];
    estimatedScoreImpact: number;
  }>;
  markdown: string;
};

export function buildRedactedReport(
  state: ConsentState,
  options: { now?: Date } = {},
): RedactedReport {
  const now = options.now ?? new Date();
  const scoreResult = computeTenscore(state, { now });
  const findings = deriveFindings(state, { now });

  const services = state.services
    .map((service) => {
      const grants = state.grants.filter(
        (grant) => grant.serviceId === service.id && grant.active,
      );
      if (grants.length === 0) return null;
      const categories = grants.map((grant) => {
        const category = state.dataCategories.find(
          (item) => item.id === grant.dataCategoryId,
        );
        return category?.label ?? grant.dataCategoryId;
      });
      const onwardRecipientCount = state.shares.filter((share) =>
        grants.some(
          (grant) =>
            grant.serviceId === share.sourceServiceId &&
            grant.dataCategoryId === share.dataCategoryId,
        ),
      ).length;

      return {
        id: service.id,
        name: service.name,
        status: service.status,
        activeGrantCount: grants.length,
        categories: [...new Set(categories)],
        onwardRecipientCount,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const report: RedactedReport = {
    generatedAt: now.toISOString(),
    profileId: state.profileId,
    profileVersion: state.profileVersion,
    score: scoreResult.score,
    label: scoreLabel(scoreResult.score),
    disclosure:
      "Redacted Tenscore demo report. Synthetic data only. Not a legal, compliance, or security assessment.",
    services,
    findings: findings.map((finding) => ({
      grantId: finding.grantId,
      types: finding.types,
      estimatedScoreImpact: finding.estimatedScoreImpact,
    })),
    markdown: "",
  };

  report.markdown = [
    `# Tenscore redacted privacy report`,
    ``,
    report.disclosure,
    ``,
    `- Profile: \`${report.profileId}\` (v${report.profileVersion})`,
    `- Control score: **${report.score.toFixed(1)} / 10** (${report.label})`,
    `- Generated: ${report.generatedAt}`,
    ``,
    `## Services`,
    ...report.services.map(
      (service) =>
        `- **${service.name}** (${service.status}): ${service.activeGrantCount} grants · categories: ${service.categories.join(", ") || "none"} · onward recipients: ${service.onwardRecipientCount}`,
    ),
    ``,
    `## Findings (redacted)`,
    ...report.findings.map(
      (finding) =>
        `- \`${finding.grantId}\` · ${finding.types.join(", ")} · impact +${finding.estimatedScoreImpact.toFixed(1)}`,
    ),
  ].join("\n");

  return report;
}
