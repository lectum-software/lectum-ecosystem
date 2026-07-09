import { type IValidatorRequest, validator } from "@/utils/validator";

const communityParam = {
  key: "id",
  coerse: "string",
  method: "string",
  min: 1,
  max: 120,
} satisfies NonNullable<IValidatorRequest["params"]>[number];

const ruleParam = {
  key: "ruleId",
  coerse: "string",
  method: "string",
  min: 1,
  max: 120,
} satisfies NonNullable<IValidatorRequest["params"]>[number];

export const showSchema: IValidatorRequest = {
  params: [communityParam],
};

export const updateSchema: IValidatorRequest = {
  params: [communityParam],
  body: [
    {
      key: "name",
      coerse: "string",
      method: "string",
      min: 2,
      max: 120,
    },
    {
      key: "description",
      coerse: "string",
      method: "string",
      max: 500,
      nullable: true,
      optional: true,
    },
    {
      key: "visual_primary_color",
      coerse: "string",
      method: "string",
      min: 7,
      max: 7,
      nullable: true,
      optional: true,
    },
    {
      key: "visual_primary_dark_color",
      coerse: "string",
      method: "string",
      min: 7,
      max: 7,
      nullable: true,
      optional: true,
    },
    {
      key: "visual_soft_color",
      coerse: "string",
      method: "string",
      min: 7,
      max: 7,
      nullable: true,
      optional: true,
    },
    {
      key: "visual_text_color",
      coerse: "string",
      method: "string",
      min: 7,
      max: 7,
      nullable: true,
      optional: true,
    },
    {
      key: "visual_gradient_color",
      coerse: "string",
      method: "string",
      min: 7,
      max: 7,
      nullable: true,
      optional: true,
    },
  ],
};

export const ruleSchema: IValidatorRequest = {
  params: [communityParam],
  body: [
    {
      key: "title",
      coerse: "string",
      method: "string",
      min: 2,
      max: 120,
    },
    {
      key: "description",
      coerse: "string",
      method: "string",
      min: 3,
      max: 500,
    },
    {
      key: "position",
      coerse: "number",
      method: "numeric",
      int: true,
      min: 0,
      optional: true,
    },
    {
      key: "active",
      coerse: "boolean",
      method: "boolean",
      optional: true,
    },
  ],
};

export const updateRuleSchema: IValidatorRequest = {
  ...ruleSchema,
  params: [communityParam, ruleParam],
};

export const deleteRuleSchema: IValidatorRequest = {
  params: [communityParam, ruleParam],
};

export const showValidator = validator(showSchema);
export const updateValidator = validator(updateSchema);
export const avatarValidator = validator(showSchema);
export const ruleValidator = validator(ruleSchema);
export const updateRuleValidator = validator(updateRuleSchema);
export const deleteRuleValidator = validator(deleteRuleSchema);

export default showValidator;
