import express from "express";
import { LOCAL_DOCUMENTATION_HOST } from "./main/server/documents/runtime-policy";
import { toSafeErrorLog } from "./utils/safe-error-log";

const app = express();
const PORT = 62155;

process.env.DOCS_MODE = "true";

async function startServer() {
  try {
    // DOCS_MODE precisa existir antes de avaliar o módulo e sua política.
    const { default: swagger, swaggerInitialization } = await import("./main/server/documents");
    await swaggerInitialization;
    app.use(swagger);

    app.listen(PORT, LOCAL_DOCUMENTATION_HOST, () => {
      console.log("🚀 Documentação iniciada.");
    });
  } catch (error) {
    console.error("Erro ao inicializar o Swagger.", toSafeErrorLog(error, "SwaggerStartupError"));
  }
}

void startServer();
