import { type IValidatorRequest, validator } from "@/utils/validator";

const idParam = {
  key: "id",
  coerse: "string",
  method: "string",
  min: 1,
  max: 120,
} satisfies NonNullable<IValidatorRequest["params"]>[number];

const reportIdParam = {
  key: "reportId",
  coerse: "string",
  method: "string",
  min: 1,
  max: 120,
} satisfies NonNullable<IValidatorRequest["params"]>[number];

const blockIdParam = {
  key: "blockId",
  coerse: "string",
  method: "string",
  min: 1,
  max: 120,
} satisfies NonNullable<IValidatorRequest["params"]>[number];

const suggestionIdParam = {
  key: "suggestionId",
  coerse: "string",
  method: "string",
  min: 1,
  max: 120,
} satisfies NonNullable<IValidatorRequest["params"]>[number];

export const eventsSchema: IValidatorRequest = {
  query: [
    { key: "page", coerse: "number", method: "numeric", int: true, min: 1, optional: true },
    {
      key: "limit",
      coerse: "number",
      method: "numeric",
      int: true,
      min: 1,
      max: 50,
      optional: true,
    },
    { key: "q", coerse: "string", method: "string", max: 120, optional: true },
    { key: "status", coerse: "string", method: "string", max: 30, optional: true },
    { key: "decision", coerse: "string", method: "string", max: 30, optional: true },
    { key: "severity", coerse: "string", method: "string", max: 30, optional: true },
    { key: "category", coerse: "string", method: "string", max: 60, optional: true },
    { key: "community", coerse: "string", method: "string", max: 120, optional: true },
    { key: "targetType", coerse: "string", method: "string", max: 30, optional: true },
    { key: "from", coerse: "string", method: "string", max: 10, optional: true },
    { key: "to", coerse: "string", method: "string", max: 10, optional: true },
  ],
};

export const operationalAlertsSchema: IValidatorRequest = {
  query: [
    { key: "page", coerse: "number", method: "numeric", int: true, min: 1, optional: true },
    {
      key: "limit",
      coerse: "number",
      method: "numeric",
      int: true,
      min: 1,
      max: 50,
      optional: true,
    },
    { key: "group", coerse: "string", method: "string", max: 30, optional: true },
    { key: "alertType", coerse: "string", method: "string", max: 60, optional: true },
    { key: "contentType", coerse: "string", method: "string", max: 20, optional: true },
    { key: "q", coerse: "string", method: "string", max: 120, optional: true },
    { key: "from", coerse: "string", method: "string", max: 10, optional: true },
    { key: "to", coerse: "string", method: "string", max: 10, optional: true },
    { key: "plan", coerse: "string", method: "string", max: 30, optional: true },
    { key: "profileStatus", coerse: "string", method: "string", max: 30, optional: true },
    { key: "status", coerse: "string", method: "string", max: 30, optional: true },
    { key: "reporter", coerse: "string", method: "string", max: 30, optional: true },
    { key: "reason", coerse: "string", method: "string", max: 80, optional: true },
    { key: "userRole", coerse: "string", method: "string", max: 30, optional: true },
  ],
};

export const communitySuggestionsSchema: IValidatorRequest = {
  query: [
    { key: "page", coerse: "number", method: "numeric", int: true, min: 1, optional: true },
    {
      key: "limit",
      coerse: "number",
      method: "numeric",
      int: true,
      min: 1,
      max: 50,
      optional: true,
    },
    { key: "q", coerse: "string", method: "string", max: 120, optional: true },
    { key: "status", coerse: "string", method: "string", max: 30, optional: true },
    { key: "blockId", coerse: "string", method: "string", max: 120, optional: true },
    { key: "userRole", coerse: "string", method: "string", max: 30, optional: true },
    { key: "from", coerse: "string", method: "string", max: 10, optional: true },
    { key: "to", coerse: "string", method: "string", max: 10, optional: true },
  ],
};

export const eventSchema: IValidatorRequest = {
  params: [idParam],
};

export const resolveSchema: IValidatorRequest = {
  params: [idParam],
  body: [{ key: "note", coerse: "string", method: "string", min: 3, max: 1000 }],
};

export const reportResolveSchema: IValidatorRequest = {
  params: [reportIdParam],
  body: [
    { key: "resolution", coerse: "string", method: "string", min: 3, max: 30 },
    { key: "measure", coerse: "string", method: "string", max: 30, optional: true },
    { key: "reason", coerse: "string", method: "string", min: 10, max: 500 },
    { key: "confirmation", coerse: "string", method: "string", min: 3, max: 80 },
  ],
};

export const communitySuggestionBlockCreateSchema: IValidatorRequest = {
  body: [
    { key: "title", coerse: "string", method: "string", min: 3, max: 120 },
    { key: "description", coerse: "string", method: "string", max: 500, optional: true },
  ],
};

export const communitySuggestionBlockUpdateSchema: IValidatorRequest = {
  params: [blockIdParam],
  body: [
    { key: "title", coerse: "string", method: "string", min: 3, max: 120, optional: true },
    { key: "description", coerse: "string", method: "string", max: 500, optional: true },
    { key: "status", coerse: "string", method: "string", min: 3, max: 30, optional: true },
  ],
};

export const communitySuggestionMoveSchema: IValidatorRequest = {
  params: [suggestionIdParam],
  body: [{ key: "blockId", coerse: "string", method: "string", max: 120, optional: true }],
};

export const communitySuggestionArchiveSchema: IValidatorRequest = {
  params: [suggestionIdParam],
};

export const communitySuggestionsValidator = validator(communitySuggestionsSchema);
export const communitySuggestionBlockCreateValidator = validator(
  communitySuggestionBlockCreateSchema,
);
export const communitySuggestionBlockUpdateValidator = validator(
  communitySuggestionBlockUpdateSchema,
);
export const communitySuggestionMoveValidator = validator(communitySuggestionMoveSchema);
export const communitySuggestionArchiveValidator = validator(communitySuggestionArchiveSchema);
export const eventsValidator = validator(eventsSchema);
export const operationalAlertsValidator = validator(operationalAlertsSchema);
export const eventValidator = validator(eventSchema);
export const resolveValidator = validator(resolveSchema);
export const reportResolveValidator = validator(reportResolveSchema);

export default eventsValidator;
