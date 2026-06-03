import i18n from "@/main/server/i18n";
import { type IValidatorRequest, validator as internalValidator } from "@/packages/validator";

const validator = (schema: IValidatorRequest) => {
  return internalValidator(schema, i18n);
};

export { type IValidatorRequest, validator };
