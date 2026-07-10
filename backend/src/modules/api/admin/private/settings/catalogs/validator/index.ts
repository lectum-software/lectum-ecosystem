import { type IValidatorRequest, validator } from "@/utils/validator";
import { ADMIN_CATALOG_TYPES } from "../DTOs/IAdminSettingsCatalogsDTO";

const idParam = [
  { key: "id", coerse: "string", method: "string", min: 1, max: 160 },
] satisfies IValidatorRequest["params"];

const createBody = [
  { key: "name", coerse: "string", method: "string", min: 2, max: 160 },
  { key: "active", coerse: "boolean", method: "boolean", optional: true },
  { key: "position", coerse: "number", method: "numeric", int: true, min: 0, optional: true },
] satisfies IValidatorRequest["body"];

const updateBody = [
  { key: "name", coerse: "string", method: "string", min: 2, max: 160, optional: true },
  { key: "active", coerse: "boolean", method: "boolean", optional: true },
  { key: "position", coerse: "number", method: "numeric", int: true, min: 0, optional: true },
] satisfies IValidatorRequest["body"];

const specialtyCreateBody = [
  ...createBody,
  { key: "category_id", coerse: "string", method: "string", min: 1, max: 160 },
] satisfies IValidatorRequest["body"];

const specialtyUpdateBody = [
  ...updateBody,
  { key: "category_id", coerse: "string", method: "string", min: 1, max: 160, optional: true },
] satisfies IValidatorRequest["body"];

export const indexValidator = validator({});
export const createCategoryValidator = validator({ body: createBody });
export const updateCategoryValidator = validator({ body: updateBody, params: idParam });
export const createItemValidator = validator({ body: createBody });
export const updateItemValidator = validator({ body: updateBody, params: idParam });
export const createSpecialtyValidator = validator({ body: specialtyCreateBody });
export const updateSpecialtyValidator = validator({ body: specialtyUpdateBody, params: idParam });
export const reorderValidator = validator({
  body: [
    {
      key: "type",
      coerse: "string",
      method: "enumeric",
      values: [...ADMIN_CATALOG_TYPES],
    },
    { key: "ids", method: "string_array" },
    { key: "category_id", coerse: "string", method: "string", min: 1, max: 160, optional: true },
  ],
});
export const restoreDefaultsValidator = validator({
  body: [{ key: "confirmation", coerse: "string", method: "string", min: 5, max: 80 }],
});
