//@ts-nocheck

//Libs
import { z } from "zod";
import { setI18n } from "./i18n";
import mocks from "./mocks";
import schema from "./schema";
import { buildValidationObjectMap } from "./schema/_internal/build-object-map";
import { custom } from "./schema/_internal/handlers/custom";
import type { ICustomValidation, IValidationParams } from "./schema/_internal/validations/types";

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

const validatorWeb = (data: IValidatorRequest, i18n?: any, language?: any) => {
  setI18n(i18n, language);

  const { bodyF, paramsF, queryF, bodyRelation, paramsRelation, queryRelation } =
    schema.preFire(data);

  //Params
  const paramsObject = buildValidationObjectMap(paramsF, schema.f);
  const queryObject = buildValidationObjectMap(queryF, schema.f);
  const bodyObject = buildValidationObjectMap(bodyF, schema.f);

  const modifiersValidator = (obj, cont, ctx, refine, local) => {
    const keys = Object.keys(cont);

    keys?.forEach((item) => {
      //@ts-expect-error
      const optional = obj[item]?.isOptional();
      //@ts-expect-error
      const nullable = obj[item]?.isNullable();

      if (cont[item] === "") {
        if (optional) {
          cont[item] = "";
        } else {
          ctx.addIssue({
            code: "custom",
            path: [item],
            message: custom("invalid_type_received_undefined"),
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

    if (!process.env.NODE_ENV?.includes("test")) {
      schema.refinesServer(cont, ctx, refine);
    }
  };

  const body = z.object(bodyObject).superRefine((cont, ctx) => {
    modifiersValidator(bodyObject, cont, ctx, bodyRelation, "body");
  });

  const params = z.object(paramsObject).superRefine((cont, ctx) => {
    modifiersValidator(paramsObject, cont, ctx, paramsRelation, "params");
  });

  const query = z.object(queryObject).superRefine((cont, ctx) => {
    modifiersValidator(queryObject, cont, ctx, queryRelation, "query");
  });

  return {
    body,
    query,
    params,
  };
};

export { validatorWeb };
