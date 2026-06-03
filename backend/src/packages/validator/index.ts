//@ts-nocheck

//Libs
import { z } from "zod";
import { setI18n } from "./i18n";
import mocks from "./mocks";
import schema from "./schema";
import { custom } from "./schema/_internal/handlers/custom";
import { type ICustomValidation, IValidationParams } from "./schema/_internal/validations/types";
import { validatorWeb } from "./web";

interface IValidator extends IValidationParams {
  method: keyof typeof schema.f;
  nullable?: boolean;
  optional?: boolean;
  coerse?: string;
  column?: string;
  model?: string;
}

interface ICustomValidator extends ICustomValidation {
  nullable?: boolean;
  optional?: boolean;
  coerse?: string;
  column?: string;
  model?: string;
}

type Relation = {
  keys: string[];
  type: keyof typeof schema.conditions;
};

interface IValidatorRequest {
  body?: (IValidator | ICustomValidation)[];
  params?: (IValidator | ICustomValidation)[];
  query?: (IValidator | ICustomValidation)[];
  relations?: {
    query?: Relation[];
    body?: Relation[];
    params?: Relation[];
  };
}

const validator = (data: IValidatorRequest, i18next?: any) => async (req, res, next) => {
  try {
    setI18n(i18next, req.language);

    const { bodyF, paramsF, queryF, bodyRelation, paramsRelation, queryRelation } = schema.preFire(
      data,
      req,
    );

    //Each Map
    const eachMap = (local) => {
      const objectMapper = {};

      new Promise((resolve) => {
        local?.forEach(async (item) => {
          const funcMethod = schema.f[item.method];
          if (!funcMethod && !item.custom)
            throw new Error(`Método "${item.method}" não encontrado!`);

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

            resolve();
          } catch {
            throw new Error(
              `Ocorreu um erro ao fazer inclusão de parâmetros no método ${item.method}`,
            );
          }
        });
      });

      return objectMapper;
    };

    //Params
    const paramsObject = eachMap(paramsF);
    const queryObject = eachMap(queryF);
    const bodyObject = eachMap(bodyF);

    const modifiersValidator = (obj, cont, ctx, refine, local) => {
      const keys = Object.keys(cont);

      keys?.forEach((item) => {
        //@ts-expect-error
        const optional = obj[item]?.isOptional();
        //@ts-expect-error
        const nullable = obj[item]?.isNullable();

        if (cont[item] === "" && !nullable) {
          if (optional) {
            ctx.addIssue({
              code: "custom",
              path: [item],
              message: custom("invalid_type_not_empty"),
            });
          } else {
            ctx.addIssue({
              code: "custom",
              path: [item],
              message: custom("invalid_type_received_null"),
            });
          }
        }
      });

      if (local === "query" && cont.select && cont.include) {
        ctx.addIssue({
          code: "custom",
          message: custom(
            "invalid_type_reverse_condition",
            {
              names: "select",
              last: "include",
            },
            "and",
          ),
          path: ["select"],
        });

        ctx.addIssue({
          code: "custom",
          message: custom(
            "invalid_type_reverse_condition",
            {
              names: "select",
              last: "include",
            },
            "and",
          ),
          path: ["include"],
        });
      }

      //Has x-refine header
      const hasRefine = req.headers["x-refine"] === "true";

      if (!process.env.NODE_ENV?.includes("test") || hasRefine) {
        schema.refinesServer(cont, ctx, refine);
      }
    };

    //Structure the schema
    const body = z
      .object(bodyObject)
      .strict({
        message: custom("not_allowed"),
      })
      .superRefine((cont, ctx) => {
        modifiersValidator(bodyObject, cont, ctx, bodyRelation, "body");
      });

    const query = z
      .object(queryObject)
      .strict({
        message: custom("not_allowed"),
      })
      .superRefine((cont, ctx) => {
        modifiersValidator(queryObject, cont, ctx, queryRelation, "query");
      });

    const params = z
      .object(paramsObject)
      .strict({
        message: custom("not_allowed"),
      })
      .superRefine((cont, ctx) => {
        modifiersValidator(paramsObject, cont, ctx, paramsRelation, "params");
      });

    //@ts-expect-error
    if (req?.schema) return { body, query, params };

    //Schema
    const schemaZod = z.object({
      body,
      query,
      params,
    });

    const resolved = await schemaZod.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    Object.keys(resolved?.body || []).forEach((item) => {
      const nullable = bodyObject[item].isNullable();

      if (nullable && resolved.body[item] === "") {
        resolved.body[item] = null;
      }
    });

    const select = Object.keys(resolved?.query?.select || {})?.length
      ? resolved?.query?.select
      : undefined;
    const include = Object.keys(resolved?.query?.include || {})?.length
      ? resolved?.query?.include
      : undefined;

    delete resolved.query.select;
    delete resolved.query.include;

    // Set the values
    req.b = {
      ...resolved.body,
      ...(req?.uploads || {}),
    };
    req.q = resolved.query;
    req.p = resolved.params;
    req.select = select;
    req.include = include;

    //Clean the values. Express 5 exposes req.query as a getter-only property,
    //so the validated aliases above remain the stable contract for handlers.
    req.body = {};

    return next();
  } catch (error) {
    const objectError = error?.issues ? schema.handleError(error) : {};
    if (!error.issues) {
      console.error(`[VALIDATOR]: ${error.message}`);
    }

    let textError = i18next.getFixedT(req.language, "translation")("error.invalid_structure");

    textError = textError.slice(0, 1).toUpperCase() + textError.slice(1);

    return res.status(400).send({
      status: 400,
      success: false,
      error: textError,
      errors: objectError,
      entity: "Development",
    });
  }
};

export { IValidationParams, type IValidatorRequest, mocks, schema, validator, validatorWeb };
