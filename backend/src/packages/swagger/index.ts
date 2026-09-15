// @ts-nocheck
// Compatibilidade: o pacote portado interpreta rotas e metadados AST dinâmicos preservando o contrato legado.

import { promises as fs } from "node:fs";
//Libs
import path from "node:path";
import { apiReference } from "@scalar/express-api-reference";
import express, { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { toSafeErrorLog } from "@/utils/safe-error-log";
//Types
import type { EndPoints, ScalarOptions } from "./types";
import { analyzeRoutesWithAST } from "./utils/analyze";
//Utils
import { swaggerGenerate } from "./utils/save";
import { loadValidations } from "./utils/validators";

const swagger = async (
  endPoints: EndPoints,
  mode?: "scalar" | "swagger",
  scalarOptions?: ScalarOptions,
) => {
  try {
    await Promise.all(
      endPoints.modules.map(async (route) => {
        const models = await processModels(route, endPoints.base);
        const routes = await processRoutes(models);
        const processedRoutes = await processParameters(routes);

        // Extrai os headers das opções do Scalar se o modo for scalar
        const defaultHeaders =
          mode === "scalar" && scalarOptions?.withDefaultHeaders
            ? scalarOptions.withDefaultHeaders
            : undefined;

        await swaggerGenerate(route.options, processedRoutes, route.module, defaultHeaders);
      }),
    );

    return true;
  } catch (error) {
    console.error(
      "\x1b[31m[SWAGGER]: Erro durante o processo\x1b[0m",
      toSafeErrorLog(error, "SwaggerGenerationError"),
    );
    return false;
  }
};

const processModels = async (route, base) => {
  const models = {};

  await Promise.all(
    route.models.map(async (model) => {
      const newBase = `${base}/${route.module}/${model}`;
      models[model] = await getModelFiles(newBase, {
        base,
        module: route.module,
        model,
        isPrivate: route.privateModels.includes(model),
      });
    }),
  );

  return models;
};

const getModelFiles = async (basePath, modelInfo) => {
  try {
    const files = await fs.readdir(basePath);
    const folders = await getFolders(files, basePath);

    return await Promise.all(
      folders.map(async (folder) => {
        const files = await path.join(basePath, folder);
        const caseFiles = await fs.readdir(files);
        const cases = await getFolders(caseFiles, files);

        return {
          ...modelInfo,
          cases,
          folder,
        };
      }),
    );
  } catch (error) {
    // console.error(`Erro ao ler o diretório ${basePath}`);
    return [];
  }
};

const getFolders = async (files, basePath) => {
  const folderList = await Promise.all(
    files.map(async (item) => {
      const itemPath = path.join(basePath, item);
      const stat = await fs.lstat(itemPath);
      return stat.isDirectory() ? item : null;
    }),
  );

  return folderList?.filter((folder) => folder !== null);
};

const processRoutes = async (models) => {
  const routes = [];

  for (const model of Object.keys(models)) {
    const modelFiles = models[model];
    for (const file of modelFiles) {
      const analyze = analyzeRoutesWithAST(file);
      routes.push(...analyze);
    }
  }

  return routes;
};

const processParameters = async (routes) => {
  return Promise.all(
    routes.map(async (route) => {
      const parameters = await loadValidations(route);
      return { ...route, parameters };
    }),
  );
};

export const swaggerRoutes = async (
  docs: EndPoints,
  mode: "scalar" | "swagger" = "scalar",
  scalarOptions?: ScalarOptions,
) => {
  const documents = Router();

  // Serve static OpenAPI JSON files from /swagger for Scalar
  const hasScalar = mode === "scalar";
  if (hasScalar) {
    documents.use("/swagger", express.static(path.resolve(process.cwd(), "swagger")));
  }

  for (const route of docs.modules) {
    const swaggerFilePath = path.resolve("./swagger", route.options.outputFile);
    const swaggerFile = JSON.parse(await fs.readFile(swaggerFilePath, "utf-8"));

    if (hasScalar) {
      try {
        const scalarConfig: any = {
          spec: {
            url: `/swagger/${route.options.outputFile}`,
          },
          theme: scalarOptions?.theme || "kepler",
          withDefaultFonts:
            scalarOptions?.withDefaultFonts !== undefined ? scalarOptions.withDefaultFonts : true,
        };

        // Merge other scalar options
        if (scalarOptions) {
          Object.keys(scalarOptions).forEach((key) => {
            if (key !== "theme" && key !== "withDefaultFonts" && !scalarConfig[key]) {
              scalarConfig[key] = scalarOptions[key];
            }
          });
        }

        documents.use(route.options.url, apiReference(scalarConfig));

        console.log(
          `\x1b[32m[SWAGGER]: Documentação Scalar de "${route.options.title}" gerada.\x1b[0m`,
        );
      } catch (error) {
        console.warn(
          `\x1b[31m[SWAGGER]: Erro ao carregar Scalar para "${route.options.title}". Usando Swagger UI padrão.\x1b[0m`,
        );
        // Fallback para Swagger UI
        setupSwaggerUI(documents, route, swaggerFile);
      }
    } else {
      setupSwaggerUI(documents, route, swaggerFile);
    }
  }

  return documents;
};

const setupSwaggerUI = (documents: Router, route: any, swaggerFile: any) => {
  documents.use(
    route.options.url,
    swaggerUi.serveFiles(swaggerFile),
    swaggerUi.setup(swaggerFile, {
      customCssUrl: "/api/docs/custom.css",
      customJs: "/api/docs/custom.js",
    }),
  );

  documents.use("/api/docs/custom.css", (_req, res) => {
    res.sendFile(`${__dirname}/custom.css`);
  });

  documents.use("/api/docs/custom.js", (_req, res) => {
    res.sendFile(`${__dirname}/custom.js`);
  });

  console.log(`\x1b[32m[SWAGGER]: Documentação de "${route.options.title}" gerada.\x1b[0m`);
};

const initializeSwagger = async (
  route: Router,
  schema: any,
  skip = false,
  noRoute = false,
  mode?: "scalar" | "swagger",
  scalarOptions?: ScalarOptions,
) => {
  if (!skip) {
    let exists = true;
    try {
      await fs.readdir(path.resolve("swagger"));
    } catch {
      exists = false;
    }

    !exists && fs.mkdir(path.resolve("swagger"));
    const generated = await swagger(schema, mode, scalarOptions);
    if (!generated) return;

    if (!noRoute) {
      const routes = await swaggerRoutes(schema, mode, scalarOptions);
      route.use(routes);
    }
  }
};

export type { EndPoints, ScalarOptions };
export { initializeSwagger, swagger };
