import type { ApiReferenceConfiguration } from "@scalar/express-api-reference";

type Module = {
  options: {
    title: string;
    description: string;
    host: string;
    outputFile: string;
    version: string;
    url: string;
  };
  module: string;
  models: string[];
  privateModels: string[];
};

export type EndPoints = {
  base: string;
  modules: Module[];
};

export type ScalarOptions = Partial<ApiReferenceConfiguration> & {
  withDefaultHeaders?: Record<string, Record<string, string>>;
};
