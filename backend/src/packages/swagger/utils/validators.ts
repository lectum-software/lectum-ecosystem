// @ts-nocheck
// Compatibilidade: os validators são inspecionados dinamicamente a partir de schemas Zod heterogêneos.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isPublishedRuntime } from "../../../utils/runtime-config";
import { toSafeErrorLog } from "../../../utils/safe-error-log";

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

    const pointsToCompiledValidator = fileValidator.includes(`${path.sep}dist${path.sep}`);
    if (fileValidator.endsWith(".ts") && (isPublishedRuntime() || pointsToCompiledValidator)) {
      fileValidator = fileValidator
        .replace(path.join(process.cwd(), "src"), path.join(process.cwd(), "dist"))
        .replace(/\.ts$/, ".js");
    }

    if (!fs.existsSync(fileValidator)) {
      return [];
    }

    // O build CommonJS transforma este import dinâmico em require(). Por isso, validators
    // compilados continuam usando caminho absoluto. No Windows, o loader ESM usado por tsx
    // em desenvolvimento exige file:// para importar arquivos TypeScript em src.
    const importTarget =
      process.platform === "win32" && fileValidator.endsWith(".ts")
        ? pathToFileURL(fileValidator).href
        : fileValidator;
    const mod = await import(importTarget);
    const validator =
      typeof mod.default === "function"
        ? mod.default
        : route.middlewares
            // No dist, o TypeScript escreve validator_1.nomeDoValidator.
            ?.flatMap((middleware) => [middleware, middleware.split(".").at(-1)])
            .map((middleware) => (middleware ? mod[middleware] : undefined))
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
      console.warn(
        "[SWAGGER]: Falha ao carregar validação de rota",
        toSafeErrorLog(e, "SwaggerValidationLoadError"),
      );
    }
    return [];
  }
}
