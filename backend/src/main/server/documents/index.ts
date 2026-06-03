import { Router } from "express";

// Swagger
import { initializeSwagger } from "@/packages/swagger";

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
    console.warn(
      `⚠️ O arquivo 'schema' não foi encontrado. O Swagger não será inicializado. ${error}`,
    );
  }
};

loadSchema();

export default route;
