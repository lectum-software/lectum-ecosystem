import { type IValidatorRequest, validator } from "@/utils/validator";

export const schema: IValidatorRequest = {
  query: [
    { key: "from", coerse: "string", method: "string", max: 10, optional: true },
    { key: "to", coerse: "string", method: "string", max: 10, optional: true },
  ],
};

export default validator(schema);
