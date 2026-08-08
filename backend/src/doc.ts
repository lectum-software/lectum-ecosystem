import express from "express";
import swagger from "./main/server/documents";
import { toSafeErrorLog } from "./utils/safe-error-log";

const app = express();
const PORT = 62155;

process.env.DOCS_MODE = "true";

function initializeSwagger() {
  return new Promise((resolve) => {
    app.use(swagger, () => resolve(true));
  });
}

async function startServer() {
  try {
    await initializeSwagger();

    app.listen(PORT, () => {
      console.log(`🚀 Docs in ${PORT}`);
    });
  } catch (error) {
    console.error("Erro ao inicializar o Swagger.", toSafeErrorLog(error, "SwaggerStartupError"));
  }
}

startServer();
