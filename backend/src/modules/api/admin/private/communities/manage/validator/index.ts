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

const targetTypeParam = {
  key: "targetType",
  coerse: "string",
  method: "string",
  min: 3,
  max: 10,
} satisfies NonNullable<IValidatorRequest["params"]>[number];

const targetIdParam = {
  key: "targetId",
  coerse: "string",
  method: "string",
  min: 1,
  max: 120,
} satisfies NonNullable<IValidatorRequest["params"]>[number];

const paginationQuery = [
  {
    key: "page",
    coerse: "number",
    method: "numeric",
    int: true,
    min: 1,
    optional: true,
  },
  {
    key: "limit",
    coerse: "number",
    method: "numeric",
    int: true,
    min: 1,
    max: 50,
    optional: true,
  },
  {
    key: "q",
    coerse: "string",
    method: "string",
    max: 120,
    optional: true,
  },
] satisfies NonNullable<IValidatorRequest["query"]>;

export const showSchema: IValidatorRequest = {
  params: [communityParam],
};

export const listSchema: IValidatorRequest = {
  query: [
    ...paginationQuery,
    {
      key: "category",
      coerse: "string",
      method: "string",
      max: 80,
      optional: true,
    },
    {
      key: "sort",
      coerse: "string",
      method: "string",
      max: 20,
      optional: true,
    },
  ],
};

export const createSchema: IValidatorRequest = {
  body: [
    {
      key: "name",
      coerse: "string",
      method: "string",
      min: 2,
      max: 120,
    },
    {
      key: "slug",
      coerse: "string",
      method: "string",
      min: 1,
      max: 100,
      nullable: true,
      optional: true,
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
      key: "category",
      coerse: "string",
      method: "string",
      max: 80,
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

export const contentSchema: IValidatorRequest = {
  params: [communityParam],
  query: [
    ...paginationQuery,
    {
      key: "type",
      coerse: "string",
      method: "string",
      max: 20,
      optional: true,
    },
    {
      key: "status",
      coerse: "string",
      method: "string",
      max: 20,
      optional: true,
    },
    {
      key: "from",
      coerse: "string",
      method: "string",
      max: 10,
      optional: true,
    },
    {
      key: "period",
      coerse: "string",
      method: "string",
      max: 20,
      optional: true,
    },
    {
      key: "to",
      coerse: "string",
      method: "string",
      max: 10,
      optional: true,
    },
  ],
};

export const rankingSchema: IValidatorRequest = {
  params: [communityParam],
  query: [
    ...paginationQuery,
    {
      key: "period",
      coerse: "string",
      method: "string",
      max: 10,
      optional: true,
    },
  ],
};

export const reportsSchema: IValidatorRequest = {
  params: [communityParam],
  query: [
    ...paginationQuery,
    {
      key: "type",
      coerse: "string",
      method: "string",
      max: 20,
      optional: true,
    },
    {
      key: "status",
      coerse: "string",
      method: "string",
      max: 30,
      optional: true,
    },
    {
      key: "from",
      coerse: "string",
      method: "string",
      max: 10,
      optional: true,
    },
    {
      key: "to",
      coerse: "string",
      method: "string",
      max: 10,
      optional: true,
    },
  ],
};

export const activitiesSchema: IValidatorRequest = {
  params: [communityParam],
  query: [
    ...paginationQuery,
    {
      key: "area",
      coerse: "string",
      method: "string",
      max: 80,
      optional: true,
    },
    {
      key: "type",
      coerse: "string",
      method: "string",
      max: 80,
      optional: true,
    },
    {
      key: "from",
      coerse: "string",
      method: "string",
      max: 10,
      optional: true,
    },
    {
      key: "to",
      coerse: "string",
      method: "string",
      max: 10,
      optional: true,
    },
  ],
};

export const removeContentSchema: IValidatorRequest = {
  params: [communityParam, targetTypeParam, targetIdParam],
  body: [
    {
      key: "reason",
      coerse: "string",
      method: "string",
      min: 3,
      max: 500,
    },
    {
      key: "confirmation",
      coerse: "string",
      method: "string",
      min: 3,
      max: 80,
    },
  ],
};

export const resolveReportsSchema: IValidatorRequest = {
  params: [communityParam, targetTypeParam, targetIdParam],
  body: [
    {
      key: "reason",
      coerse: "string",
      method: "string",
      min: 3,
      max: 500,
    },
    {
      key: "confirmation",
      coerse: "string",
      method: "string",
      min: 3,
      max: 80,
    },
    {
      key: "resolution",
      coerse: "string",
      method: "string",
      min: 3,
      max: 20,
    },
  ],
};

export const showValidator = validator(showSchema);
export const listValidator = validator(listSchema);
export const createValidator = validator(createSchema);
export const updateValidator = validator(updateSchema);
export const avatarValidator = validator(showSchema);
export const ruleValidator = validator(ruleSchema);
export const updateRuleValidator = validator(updateRuleSchema);
export const deleteRuleValidator = validator(deleteRuleSchema);
export const contentValidator = validator(contentSchema);
export const rankingValidator = validator(rankingSchema);
export const reportsValidator = validator(reportsSchema);
export const activitiesValidator = validator(activitiesSchema);
export const removeContentValidator = validator(removeContentSchema);
export const resolveReportsValidator = validator(resolveReportsSchema);

export default showValidator;
