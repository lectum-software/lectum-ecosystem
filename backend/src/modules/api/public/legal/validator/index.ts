import { validator } from "@/utils/validator";
export const currentValidator = validator({});
export const detailValidator = validator({
  params: [{ key: "id", method: "string", min: 1, max: 160 }],
});
