import type {
  AccessLevel,
  ConsentState,
  DomainError,
  Necessity,
} from "./types";

export type ManualGrantInput = {
  dataCategoryId: string;
  level: AccessLevel;
  necessity: Necessity;
};

export type AddManualServiceInput = {
  name: string;
  purpose: string;
  grants: ManualGrantInput[];
  status?: "active" | "dormant";
  now?: Date;
};

export type AddManualServiceResult =
  | { ok: true; state: ConsentState; serviceId: string; grantIds: string[] }
  | { ok: false; error: DomainError };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

export function addManualService(
  state: ConsentState,
  input: AddManualServiceInput,
): AddManualServiceResult {
  const name = input.name.trim();
  const purpose = input.purpose.trim();
  if (!name || !purpose) {
    return {
      ok: false,
      error: {
        code: "INVALID_SERVICE",
        retryable: false,
        message: "Name and purpose are required",
      },
    };
  }

  if (!input.grants.length) {
    return {
      ok: false,
      error: {
        code: "INVALID_SERVICE",
        retryable: false,
        message: "At least one grant is required",
      },
    };
  }

  for (const grant of input.grants) {
    if (!state.dataCategories.some((c) => c.id === grant.dataCategoryId)) {
      return {
        ok: false,
        error: {
          code: "UNKNOWN_CATEGORY",
          retryable: false,
          message: `Unknown data category: ${grant.dataCategoryId}`,
        },
      };
    }
  }

  const now = input.now ?? new Date();
  const baseId = slugify(name) || "manual-service";
  let serviceId = `manual-${baseId}`;
  let suffix = 1;
  while (state.services.some((service) => service.id === serviceId)) {
    serviceId = `manual-${baseId}-${suffix}`;
    suffix += 1;
  }

  const grantIds: string[] = [];
  const grants = input.grants.map((grant, index) => {
    const id = `${serviceId}-grant-${index + 1}`;
    grantIds.push(id);
    return {
      id,
      serviceId,
      dataCategoryId: grant.dataCategoryId,
      level: grant.level,
      necessity: grant.necessity,
      purpose: `${purpose} (${grant.dataCategoryId})`,
      grantedAt: now.toISOString(),
      lastUsedAt: now.toISOString(),
      active: true,
    };
  });

  return {
    ok: true,
    serviceId,
    grantIds,
    state: {
      ...state,
      profileVersion: state.profileVersion + 1,
      services: [
        ...state.services,
        {
          id: serviceId,
          name,
          purpose,
          status: input.status ?? "active",
          lastUsedAt: now.toISOString(),
        },
      ],
      grants: [...state.grants, ...grants],
    },
  };
}
