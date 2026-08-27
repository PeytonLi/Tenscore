export type AccessLevel =
  | "metadata"
  | "read"
  | "write"
  | "background"
  | "admin";

export type Necessity = "required" | "useful" | "unused";

export type ServiceStatus = "active" | "dormant";

export type Service = {
  id: string;
  name: string;
  purpose: string;
  status: ServiceStatus;
  lastUsedAt: string;
};

export type DataCategory = {
  id: string;
  label: string;
  sensitivity: 1 | 2 | 3 | 4 | 5;
};

export type PermissionGrant = {
  id: string;
  serviceId: string;
  dataCategoryId: string;
  level: AccessLevel;
  necessity: Necessity;
  purpose: string;
  grantedAt: string;
  lastUsedAt: string;
  active: boolean;
};

export type DataShare = {
  id: string;
  sourceServiceId: string;
  recipientName: string;
  dataCategoryId: string;
  purpose: string;
};

export type FeatureDependency = {
  id: string;
  serviceId: string;
  featureName: string;
  requiredGrantIds: string[];
  degradedGrantIds: string[];
};

export type DemoProfile = {
  id: string;
  name: string;
  version: number;
  personNodeId: string;
  services: Service[];
  dataCategories: DataCategory[];
  grants: PermissionGrant[];
  shares: DataShare[];
  features: FeatureDependency[];
};

export type ConsentState = {
  profileId: string;
  profileVersion: number;
  personNodeId: string;
  services: Service[];
  dataCategories: DataCategory[];
  grants: PermissionGrant[];
  shares: DataShare[];
  features: FeatureDependency[];
};

export type ScoreContribution = {
  grantId: string;
  permissionRisk: number;
  factors: {
    sensitivity: number;
    access: number;
    necessity: number;
    recency: number;
    sharing: number;
  };
};

export type TenscoreResult = {
  score: number;
  totalRisk: number;
  referenceMaxRisk: number;
  contributions: ScoreContribution[];
  factors: {
    permissionSensitivity: number;
    accessBreadth: number;
    dormantAccess: number;
    onwardSharing: number;
  };
};

export type FindingType = "sensitive" | "excessive" | "stale" | "shared";

export type Finding = {
  id: string;
  grantId: string;
  serviceId: string;
  dataCategoryId: string;
  types: FindingType[];
  reason: string;
  recommendedAction: "keep" | "stage_revoke" | "stage_downgrade";
  estimatedScoreImpact: number;
  featureLossWarning?: string;
  evidence: {
    lastUsedAt: string;
    level: AccessLevel;
    necessity: Necessity;
    purpose: string;
    downstreamRecipients: string[];
  };
};

export type PlannedChange = {
  grantId: string;
  action: "revoke" | "downgrade";
  targetLevel?: AccessLevel;
};

export type Approval = {
  id: string;
  profileId: string;
  profileVersion: number;
  planHash: string;
  expiresAt: string;
  usedAt?: string;
};

export type FeatureImpact = {
  featureId: string;
  featureName: string;
  serviceId: string;
  effect: "disabled" | "degraded" | "unchanged";
};

export type DomainError = {
  code: string;
  retryable: boolean;
  message: string;
};
