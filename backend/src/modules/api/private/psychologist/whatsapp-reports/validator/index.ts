import { type IValidatorRequest, validator } from "@/utils/validator";

const params: IValidatorRequest = { params: [{ key: "id", method: "string", max: 64 }] };
export const reportValidator = validator(params);
export const answerValidator = validator({
  ...params,
  body: [{ key: "count", method: "numeric", int: true, min: 0, max: 1_000_000 }],
});
