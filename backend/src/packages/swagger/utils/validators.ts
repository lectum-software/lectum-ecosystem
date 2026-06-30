//@ts-nocheck

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const zodToSwagger = (zodSchema, location = "body") => {
  if (!zodSchema?._def) return [];

  if (zodSchema._def.typeName === "ZodEffects") {
    return zodToSwagger(zodSchema._def.schema, location);
  }

  const rawShape = zodSchema._def.shape;
  const shape = typeof rawShape === "function" ? rawShape() : rawShape || {};
  const params = [];

  for (const [key, field] of Object.entries(shape)) {
    const fieldType = field._def?.typeName || field._def?.type;
    const innerType = field._def?.innerType;
    const innerFieldType = innerType?._def?.typeName || innerType?._def?.type;
    const isOptional =
      field.isOptional?.() ||
      fieldType === "ZodOptional" ||
      fieldType === "optional" ||
      innerFieldType === "ZodOptional" ||
      innerFieldType === "optional";
    const isNullable =
      field.isNullable?.() || fieldType === "ZodNullable" || fieldType === "nullable";

    const schema = isOptional || isNullable ? innerType || field : field;
    const schemaType = schema?._def?.typeName || schema?._def?.type;

    const param = {
      in: location,
      name: key,
      required: !isOptional,
      schema: {
        type: mapZodTypeToSwaggerType(schemaType),
        nullable: isNullable,
      },
      description: `Parâmetro ${key} do ${location}.`,
    };

    params.push(param);
  }

  return params;
};

const mapZodTypeToSwaggerType = (zodType) => {
  switch (zodType) {
    case "ZodString":
      return "string";
    case "ZodNumber":
      return "number";
    case "ZodBoolean":
      return "boolean";
    case "ZodArray":
      return "array";
    default:
      return "string";
  }
};

export async function loadValidations(route) {
  try {
    if (!route.validator) return [];

    let fileValidator = path.resolve(route.validator);

    const isProd = process.env.NODE_ENV?.includes("prod");
    if (fileValidator.endsWith(".ts") && isProd) {
      fileValidator = fileValidator
        .replace(path.join(process.cwd(), "src"), path.join(process.cwd(), "dist"))
        .replace(/\.ts$/, ".js");
    }

    if (!fs.existsSync(fileValidator)) {
      return [];
    }

    const mod = await import(pathToFileURL(fileValidator).href);
    const validator =
      typeof mod.default === "function"
        ? mod.default
        : route.middlewares
            ?.map((middleware) => mod[middleware])
            .find((item) => typeof item === "function");

    if (typeof validator !== "function") {
      return [];
    }

    const items = await validator({ schema: true });
    const body = zodToSwagger(items.body, "body");
    const params = zodToSwagger(items.params, "path");
    const query = zodToSwagger(items.query, "query");

    return [body, params, query].flat();
  } catch (e) {
    if (process.env.SWAGGER_DEBUG === "true") {
      console.warn("[SWAGGER]: Falha ao carregar validação de rota", e);
    }
    return [];
  }
}
