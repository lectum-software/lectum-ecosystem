/* eslint-disable @typescript-eslint/no-explicit-any */

import { promises as fs } from "node:fs";
import path from "node:path";
import { toSafeErrorLog } from "@/utils/safe-error-log";

/**
 * Ordena recursivamente as chaves de um objeto.
 * - Se o valor for um array de strings que obedeçam ao padrão de tag,
 *   ele o ordena usando um comparador customizado.
 * - Em objetos, a chave "tags" é priorizada para aparecer primeiro.
 */
function sortObject(obj: any): any {
  if (Array.isArray(obj)) {
    // Se for um array de strings e todas obedecem ao padrão de tag, ordena-o.
    if (
      obj.every(
        (item) =>
          typeof item === "string" && /^\[.+?\]\s*-\s*(.+?)\s*\((Private|Public)\)$/.test(item),
      )
    ) {
      return obj.slice().sort((a, b) => {
        const extract = (s: string) => {
          const match = s.match(/^\[.+?\]\s*-\s*(.+?)\s*\((Private|Public)\)$/);
          if (match) {
            return { base: match[1].trim(), privacy: match[2] };
          }
          return { base: s, privacy: "" };
        };
        const aTag = extract(a);
        const bTag = extract(b);
        const baseComp = aTag.base.localeCompare(bTag.base);
        if (baseComp !== 0) return baseComp;
        // Para o mesmo base, "Private" vem antes de "Public"
        if (aTag.privacy === bTag.privacy) return 0;
        return aTag.privacy === "Private" ? -1 : 1;
      });
    } else {
      return obj.map(sortObject);
    }
  } else if (obj !== null && typeof obj === "object") {
    const sortedKeys = Object.keys(obj).sort((a, b) => {
      if (a === "tags" && b !== "tags") {
        return -1;
      } else if (b === "tags" && a !== "tags") {
        return 1;
      } else {
        return a.localeCompare(b);
      }
    });
    const result: any = {};
    for (const key of sortedKeys) {
      result[key] = sortObject(obj[key]);
    }
    return result;
  }
  return obj;
}

export const swaggerGenerate = async (
  options: any,
  paths: any,
  moduleName: string,
  defaultHeaders?: Record<string, Record<string, string>>,
) => {
  // Cria os security schemes baseados nos headers customizados do módulo específico
  const customSecuritySchemes: any = {};

  // Pega os headers específicos do módulo ou headers globais se não houver específicos
  const moduleHeaders = defaultHeaders?.[moduleName] || defaultHeaders?.["*"] || {};

  if (Object.keys(moduleHeaders).length > 0) {
    Object.entries(moduleHeaders).forEach(([headerName, defaultValue]) => {
      // Cria um nome limpo para o scheme (remove caracteres especiais e hífens)
      const schemeName =
        headerName
          .replace(/^x-/, "")
          .replace(/-/g, "_")
          .replace(/[^a-zA-Z0-9_]/g, "")
          .slice(0, 1)
          .toUpperCase() +
        headerName.slice(3) +
        "Header";

      customSecuritySchemes[schemeName] = {
        type: "apiKey",
        in: "header",
        name: headerName,
        description: `Header ${headerName} (padrão: ${defaultValue})`,
      };
    });
  }

  // Monta a estrutura básica do documento
  const swaggerDoc: any = {
    openapi: "3.1.0",
    info: {
      title: options.title || "API Documentation",
      description: options.description || "API Documentation",
      version: options.version || "1.0.0",
    },
    servers: [
      {
        // O documento versionado nunca incorpora host de ambiente. A URL
        // relativa funciona no servidor que estiver exibindo a documentação.
        url: "/",
      },
    ],
    paths: {},
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        ...customSecuritySchemes,
      },
    },
  };

  // Para cada rota definida em "paths"
  paths.forEach((item: any) => {
    const { path: routePath, method, tag, isPrivate, parameters, uploads } = item;
    const routeParameters = parameters || [];
    const routeUploads = uploads || [];

    if (!swaggerDoc.paths[routePath]) {
      swaggerDoc.paths[routePath] = {};
    }

    // Obtém os nomes dos parâmetros que fazem upload
    const uploadKeys = routeUploads.map((upload: any) => upload.name);

    // Separa os parâmetros que não são do corpo (por exemplo: query, path, header)
    const nonBodyParams = routeParameters.filter(
      (param: any) => param.in !== "body" && !uploadKeys.includes(param.name),
    );

    // Parâmetros que estão no corpo (ou que se referem a uploads)
    const bodyParams = routeParameters.filter(
      (param: any) => param.in === "body" || uploadKeys.includes(param.name),
    );

    // Mapeia os parâmetros para a propriedade "parameters" (apenas query, path, etc)
    const opParameters = nonBodyParams.map((param: any) => {
      const isObject =
        param.in === "query" && (param.name === "select" || param.name === "include");

      return {
        in: param.in,
        name: param.name,
        required: param.required,
        schema: {
          ...param.schema,
          type: isObject ? "object" : param.schema.type,
        },
        style: isObject ? "deepObject" : param?.style,
        explode: isObject ? true : param?.explode,
        description: param.description,
      };
    });

    // Se houver bodyParams ou uploads, cria o requestBody
    let requestBody: Record<string, unknown> | undefined;
    if (bodyParams.length > 0 || routeUploads.length > 0) {
      const properties: any = {};
      const required: string[] = [];
      bodyParams.forEach((param: any) => {
        properties[param.name] = {
          ...param.schema,
          description: param.description,
          required: !!param.required,
        };
        if (param.required) required.push(param.name);
      });
      routeUploads.forEach((upload: any) => {
        const itemInParams = routeParameters.find((i: any) => i.name === upload.name);
        properties[upload.name] = {
          ...upload.schema,
          description: `${upload.description} ${
            itemInParams?.schema?.nullable ? "(Send NULL to delete file)" : ""
          }`,
        };
        if (itemInParams?.required) required.push(upload.name);
      });
      const hasFile = uploads.length > 0;
      const mediaType = hasFile ? "multipart/form-data" : "application/x-www-form-urlencoded";
      requestBody = {
        content: {
          [mediaType]: {
            schema: {
              type: "object",
              properties,
              ...(required.length > 0 && { required }),
            },
          },
        },
      };
    }

    // Constrói a tag: formata-a como "<tag> (Private)" ou "<tag> (Public)"
    // Aqui, o valor de "tag" pode ser algo como "[XYZ] - LEVEL"
    const groupTag = isPrivate ? `${tag} (Private)` : `${tag} (Public)`;

    // Cria os security requirements
    const securityRequirements: any[] = [];

    // Adiciona BearerAuth para rotas privadas
    if (isPrivate) {
      securityRequirements.push({ BearerAuth: [] });
    }

    // Adiciona os custom headers como security requirements
    if (Object.keys(moduleHeaders).length > 0) {
      Object.keys(moduleHeaders).forEach((headerName) => {
        const schemeName = `${headerName
          .replace(/^x-/, "")
          .replace(/-/g, "_")
          .replace(/[^a-zA-Z0-9_]/g, "")}Header`;
        securityRequirements.push({ [schemeName]: [] });
      });
    }

    const operationObject: any = {
      tags: [groupTag],
      description: `Endpoint ${isPrivate ? "(Private)" : "(Public)"}`,
      parameters: opParameters,
      responses: {
        200: { description: "Successful operation" },
        400: { description: "Validation error" },
        401: { description: "Unauthorized" },
      },
      ...(securityRequirements.length > 0 && {
        security: securityRequirements,
      }),
    };

    if (requestBody) {
      operationObject.requestBody = requestBody;
    }

    swaggerDoc.paths[routePath][method.toLowerCase()] = operationObject;
  });

  // Gerar a lista única de tags e ordená-las
  const tagSet = new Set<string>();
  for (const route of Object.values(swaggerDoc.paths) as Record<string, any>[]) {
    for (const operation of Object.values(route) as any[]) {
      if (operation.tags && Array.isArray(operation.tags)) {
        for (const tag of operation.tags) {
          tagSet.add(tag);
        }
      }
    }
  }
  const tagArray = Array.from(tagSet);
  tagArray.sort((a, b) => {
    // Agora o regex aceita qualquer conteúdo entre colchetes
    const extract = (s: string) => {
      const match = s.match(/^\[.+?\]\s*-\s*(.+?)\s*\((Private|Public)\)$/);
      if (match) {
        return { base: match[1].trim(), privacy: match[2] };
      }
      return { base: s, privacy: "" };
    };
    const aTag = extract(a);
    const bTag = extract(b);
    const baseComp = aTag.base.localeCompare(bTag.base);
    if (baseComp !== 0) return baseComp;
    return aTag.privacy === "Private" ? -1 : 1;
  });
  swaggerDoc.tags = tagArray.map((t) => ({ name: t }));

  const sortedSwaggerDoc = sortObject(swaggerDoc);
  try {
    await fs.mkdir("./swagger", { recursive: true });
    const outputFile = path.resolve("./swagger", options.outputFile);
    await fs.writeFile(outputFile, JSON.stringify(sortedSwaggerDoc, null, 2));
  } catch (error) {
    console.error(
      "\x1b[31m[SWAGGER]: Erro ao salvar JSON\x1b[0m",
      toSafeErrorLog(error, "SwaggerWriteError"),
    );
  }
};
