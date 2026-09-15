import type { ZodType } from "zod";

type ValidationItem = {
  custom?: ZodType;
  key: string;
  method: string;
  nullable?: boolean;
  optional?: boolean;
  [key: string]: unknown;
};

type ValidationFactory = (item: ValidationItem) => ZodType;

export const buildValidationObjectMap = (
  items: ValidationItem[] | undefined,
  validationFunctions: Record<string, ValidationFactory>,
) => {
  const objectMapper: Record<string, ZodType> = {};

  for (const item of items || []) {
    const funcMethod = validationFunctions[item.method];
    if (!funcMethod && !item.custom) {
      throw new Error(`Método "${item.method}" não encontrado!`);
    }

    let method;
    try {
      method = item.custom || funcMethod(item);
    } catch {
      throw new Error(`Ocorreu um erro na função validadora ${item.method}`);
    }

    try {
      if (item.optional && item.nullable) {
        objectMapper[item.key] = method.optional().nullable();
      } else if (item.optional) {
        objectMapper[item.key] = method.optional();
      } else if (item.nullable) {
        objectMapper[item.key] = method.nullable();
      } else {
        objectMapper[item.key] = method;
      }
    } catch {
      throw new Error(`Ocorreu um erro ao incluir parâmetros no método ${item.method}`);
    }
  }

  return objectMapper;
};
