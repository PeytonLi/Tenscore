import { z } from "zod";

export const findingTypesSchema = z.object({
  findingTypes: z
    .array(z.enum(["sensitive", "excessive", "stale", "shared"]))
    .min(1),
  limit: z.number().int().min(1).max(10).optional(),
});

export const traceSchema = z
  .object({
    dataCategory: z.string().optional(),
    serviceId: z.string().optional(),
  })
  .refine((value) => Boolean(value.dataCategory || value.serviceId), {
    message: "Provide dataCategory or serviceId",
  });

export const inspectSchema = z.object({
  grantId: z.string().min(1),
});

export const changeItemSchema = z.object({
  grantId: z.string(),
  action: z.enum(["revoke", "downgrade"]),
  targetLevel: z
    .enum(["metadata", "read", "write", "background"])
    .optional(),
});

export const simulateSchema = z.object({
  changes: z.array(changeItemSchema).min(1).max(12),
  preserveFeatures: z.array(z.string()).optional(),
});

export const stageSchema = z.object({
  changes: z.array(changeItemSchema).min(1).max(12),
});

export const applySchema = z.object({
  approvalId: z.string().min(1),
});

export const emptySchema = z.object({}).strict();

export function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // Narrow JSON Schema for WebMCP; keep enums and required explicit.
  if (schema === findingTypesSchema) {
    return {
      type: "object",
      properties: {
        findingTypes: {
          type: "array",
          items: { enum: ["sensitive", "excessive", "stale", "shared"] },
          description: "Finding categories to include",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 10,
          description: "Max findings to return",
        },
      },
      required: ["findingTypes"],
      additionalProperties: false,
    };
  }
  if (schema === traceSchema) {
    return {
      type: "object",
      properties: {
        dataCategory: {
          type: "string",
          description: "Data category id such as precise_location",
        },
        serviceId: { type: "string", description: "Service id to focus" },
      },
      additionalProperties: false,
    };
  }
  if (schema === inspectSchema) {
    return {
      type: "object",
      properties: {
        grantId: { type: "string", description: "Permission grant id" },
      },
      required: ["grantId"],
      additionalProperties: false,
    };
  }
  if (schema === simulateSchema || schema === stageSchema) {
    return {
      type: "object",
      properties: {
        changes: {
          type: "array",
          minItems: 1,
          maxItems: 12,
          items: {
            type: "object",
            properties: {
              grantId: { type: "string" },
              action: { enum: ["revoke", "downgrade"] },
              targetLevel: {
                enum: ["metadata", "read", "write", "background"],
              },
            },
            required: ["grantId", "action"],
            additionalProperties: false,
          },
        },
        ...(schema === simulateSchema
          ? {
              preserveFeatures: {
                type: "array",
                items: { type: "string" },
                description: "Feature names that must remain available",
              },
            }
          : {}),
      },
      required: ["changes"],
      additionalProperties: false,
    };
  }
  if (schema === applySchema) {
    return {
      type: "object",
      properties: {
        approvalId: { type: "string", description: "UI approval id" },
      },
      required: ["approvalId"],
      additionalProperties: false,
    };
  }
  return { type: "object", properties: {}, additionalProperties: false };
}
