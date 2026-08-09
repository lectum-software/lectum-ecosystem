import { type IValidatorRequest, validator } from "@/utils/validator";

export const schema: IValidatorRequest = {
  query: [
    {
      key: "limit",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      max: 50,
      optional: true,
    },
    {
      key: "page",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      optional: true,
    },
    {
      key: "search",
      coerse: "string",
      method: "string",
      max: 120,
      optional: true,
    },
    {
      key: "specialty",
      coerse: "string",
      method: "string",
      max: 100,
      format: "lower",
      optional: true,
    },
    {
      key: "service",
      coerse: "string",
      method: "string",
      max: 100,
      format: "lower",
      optional: true,
    },
    {
      key: "modality",
      coerse: "string",
      method: "string",
      max: 20,
      format: "lower",
      optional: true,
    },
    {
      key: "approach",
      coerse: "string",
      method: "string",
      max: 100,
      format: "lower",
      optional: true,
    },
    {
      key: "target_audience",
      coerse: "string",
      method: "string",
      max: 80,
      format: "lower",
      optional: true,
    },
    {
      key: "state",
      coerse: "string",
      method: "string",
      max: 2,
      format: "upper",
      optional: true,
    },
    {
      key: "city",
      coerse: "string",
      method: "string",
      max: 120,
      optional: true,
    },
    {
      key: "gender",
      coerse: "string",
      method: "string",
      max: 60,
      format: "lower",
      optional: true,
    },
    {
      key: "race_color",
      coerse: "string",
      method: "string",
      max: 60,
      format: "lower",
      optional: true,
    },
    {
      key: "religion",
      coerse: "string",
      method: "string",
      max: 80,
      format: "lower",
      optional: true,
    },
    {
      key: "language",
      coerse: "string",
      method: "string",
      max: 80,
      optional: true,
    },
    {
      key: "more_experienced",
      coerse: "boolean",
      method: "boolean",
      optional: true,
    },
    {
      key: "discount_first_session",
      coerse: "boolean",
      method: "boolean",
      optional: true,
    },
    {
      key: "accepts_insurance",
      coerse: "boolean",
      method: "boolean",
      optional: true,
    },
    {
      key: "social_value",
      coerse: "boolean",
      method: "boolean",
      optional: true,
    },
    {
      key: "available_today",
      coerse: "boolean",
      method: "boolean",
      optional: true,
    },
    {
      key: "verified",
      coerse: "boolean",
      method: "boolean",
      optional: true,
    },
  ],
};

export default validator(schema);

export const profileShowSchema: IValidatorRequest = {
  params: [
    {
      key: "id",
      coerse: "string",
      method: "string",
    },
  ],
};

export const searchImpressionSchema: IValidatorRequest = {
  ...profileShowSchema,
  body: [
    {
      key: "path",
      coerse: "string",
      method: "string",
      max: 512,
      optional: true,
    },
    {
      key: "position",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      max: 10000,
      optional: true,
    },
  ],
};

export const profileListSchema: IValidatorRequest = {
  ...profileShowSchema,
  query: [
    {
      key: "limit",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      max: 50,
      optional: true,
    },
    {
      key: "page",
      coerse: "number",
      method: "numeric",
      int: true,
      positive: true,
      optional: true,
    },
  ],
};

export const contactSchema: IValidatorRequest = {
  ...profileShowSchema,
  body: [
    {
      key: "patient_phone",
      coerse: "string",
      method: "phone",
    },
    {
      key: "consent_accepted",
      coerse: "boolean",
      method: "boolean",
    },
  ],
};

export const profileVideoWatchSchema: IValidatorRequest = {
  ...profileShowSchema,
  body: [
    {
      key: "session_key",
      coerse: "string",
      method: "string",
      max: 120,
    },
    {
      key: "duration_seconds",
      coerse: "number",
      method: "numeric",
      int: true,
      min: 0,
      optional: true,
    },
    {
      key: "watched_seconds",
      coerse: "number",
      method: "numeric",
      int: true,
      min: 0,
      optional: true,
    },
    {
      key: "max_position_seconds",
      coerse: "number",
      method: "numeric",
      int: true,
      min: 0,
      optional: true,
    },
    {
      key: "replay_count",
      coerse: "number",
      method: "numeric",
      int: true,
      min: 0,
      optional: true,
    },
    {
      key: "completed",
      coerse: "boolean",
      method: "boolean",
      optional: true,
    },
    {
      key: "milestone_25",
      coerse: "boolean",
      method: "boolean",
      optional: true,
    },
    {
      key: "milestone_50",
      coerse: "boolean",
      method: "boolean",
      optional: true,
    },
    {
      key: "milestone_75",
      coerse: "boolean",
      method: "boolean",
      optional: true,
    },
    {
      key: "milestone_100",
      coerse: "boolean",
      method: "boolean",
      optional: true,
    },
  ],
};

export const profileShowValidator = validator(profileShowSchema);
export const searchImpressionValidator = validator(searchImpressionSchema);
export const profileListValidator = validator(profileListSchema);
export const contactValidator = validator(contactSchema);
export const profileVideoWatchValidator = validator(profileVideoWatchSchema);
