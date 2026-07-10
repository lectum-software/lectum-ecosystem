import { type IValidatorRequest, validator } from "@/utils/validator";

export const schema: IValidatorRequest = {
  params: [{ key: "id", coerse: "string", method: "string" }],
};

export default validator(schema);
