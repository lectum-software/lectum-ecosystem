import { Router } from "express";

// Swagger
import { initializeSwagger } from "@/packages/swagger";
import { toSafeErrorLog } from "@/utils/safe-error-log";

const route = Router();

const loadSchema = async () => {
  try {
    const { schema } = await import("./schema");
    initializeSwagger(
      route,
      schema,
      process.env.DOCS_MODE === "true" ? false : process.env.SWAGGER !== "true",
      false,
      "scalar",
      {
        withDefaultHeaders: {
          api: {
            "x-device": "web",
          },
        },
      },
    );
  } catch (error) {
    console.warn("O Swagger não será inicializado.", toSafeErrorLog(error, "SwaggerSchemaError"));
  }
};

loadSchema();

export default route;
