import { Router } from "express";

import { toSafeErrorLog } from "@/utils/safe-error-log";
import { isSwaggerDocumentationEnabled } from "./runtime-policy";

const route = Router();

const loadSchema = async () => {
  if (!isSwaggerDocumentationEnabled()) return;

  try {
    const [{ initializeSwagger }, { schema }] = await Promise.all([
      import("@/packages/swagger"),
      import("./schema"),
    ]);
    await initializeSwagger(route, schema, false, false, "scalar", {
      withDefaultHeaders: {
        api: {
          "x-device": "web",
        },
      },
    });
  } catch (error) {
    console.warn("O Swagger não será inicializado.", toSafeErrorLog(error, "SwaggerSchemaError"));
  }
};

export const swaggerInitialization = loadSchema();

export default route;
