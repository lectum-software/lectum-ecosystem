import { isPublishedRuntime } from "@/utils/runtime-config";

type SwaggerRuntimeEnvironment = {
  DOCS_MODE?: string;
  NODE_ENV?: string;
  SWAGGER?: string;
};

export const LOCAL_DOCUMENTATION_HOST = "127.0.0.1";

/**
 * A documentação é uma ferramenta exclusivamente local. Flags operacionais
 * nunca podem reabri-la em homologação, staging ou produção.
 */
export const isSwaggerDocumentationEnabled = (
  environment: SwaggerRuntimeEnvironment = process.env,
) =>
  !isPublishedRuntime(environment.NODE_ENV) &&
  (environment.DOCS_MODE === "true" || environment.SWAGGER === "true");
