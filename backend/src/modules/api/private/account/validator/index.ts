import { type IValidatorRequest, validator } from "@/utils/validator";

export const emailSchema: IValidatorRequest = {
  body: [
    {
      key: "current_password",
      coerse: "string",
      method: "string",
      min: 1,
      max: 128,
    },
    {
      key: "email",
      coerse: "string",
      method: "email",
    },
  ],
};

export const passwordSchema: IValidatorRequest = {
  body: [
    {
      key: "current_password",
      coerse: "string",
      method: "string",
      min: 1,
      max: 128,
    },
    {
      key: "password",
      coerse: "string",
      method: "password",
    },
    {
      key: "password_confirm",
      coerse: "string",
      method: "password",
    },
  ],
  relations: {
    body: [
      {
        keys: ["password", "password_confirm"],
        type: "equal",
      },
    ],
  },
};

export const deleteSchema: IValidatorRequest = {
  body: [
    {
      key: "confirmation",
      coerse: "string",
      method: "string",
      min: 6,
      max: 16,
    },
    {
      key: "current_password",
      coerse: "string",
      method: "string",
      min: 1,
      max: 128,
      optional: true,
    },
  ],
};

export const deleteGoogleIntentSchema: IValidatorRequest = {
  body: [
    {
      key: "callback_url",
      coerse: "string",
      method: "string",
      min: 1,
      max: 256,
      optional: true,
    },
  ],
};

export const onboardingTipsSchema: IValidatorRequest = {
  body: [
    {
      key: "has_seen_discover_psychologists_tip",
      method: "boolean",
      optional: true,
    },
    {
      key: "has_seen_community_post_tip",
      method: "boolean",
      optional: true,
    },
    {
      key: "has_seen_psychologists_my_search_tip",
      method: "boolean",
      optional: true,
    },
    {
      key: "has_seen_psychologist_whatsapp_tip",
      method: "boolean",
      optional: true,
    },
  ],
};

export const deleteGoogleIntentValidator = validator(deleteGoogleIntentSchema);
export const deleteValidator = validator(deleteSchema);
export const emailValidator = validator(emailSchema);
export const onboardingTipsValidator = validator(onboardingTipsSchema);
export const passwordValidator = validator(passwordSchema);
