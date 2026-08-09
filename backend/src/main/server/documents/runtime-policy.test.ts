import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSwaggerDocumentationEnabled, LOCAL_DOCUMENTATION_HOST } from "./runtime-policy";

describe("Swagger runtime policy", () => {
  it("nunca expõe documentação em runtime publicado, mesmo com flags ativas", () => {
    for (const nodeEnv of ["production", "prod", "homolog", "homologation", "stage", "staging"]) {
      assert.equal(
        isSwaggerDocumentationEnabled({
          DOCS_MODE: "true",
          NODE_ENV: nodeEnv,
          SWAGGER: "true",
        }),
        false,
      );
    }
  });

  it("permite geração ou visualização somente quando habilitada localmente", () => {
    assert.equal(LOCAL_DOCUMENTATION_HOST, "127.0.0.1");
    assert.equal(isSwaggerDocumentationEnabled({ NODE_ENV: "development", SWAGGER: "true" }), true);
    assert.equal(
      isSwaggerDocumentationEnabled({ DOCS_MODE: "true", NODE_ENV: "development" }),
      true,
    );
    assert.equal(isSwaggerDocumentationEnabled({ NODE_ENV: "development" }), false);
  });

  it("mantém o router vazio em homologação mesmo com todas as flags ativas", async () => {
    const previous = {
      DOCS_MODE: process.env.DOCS_MODE,
      NODE_ENV: process.env.NODE_ENV,
      SWAGGER: process.env.SWAGGER,
    };

    try {
      process.env.DOCS_MODE = "true";
      process.env.NODE_ENV = "homolog";
      process.env.SWAGGER = "true";

      const documents = await import("./index");
      await documents.swaggerInitialization;
      const stack = Reflect.get(documents.default, "stack");

      assert.equal(Array.isArray(stack), true);
      assert.equal(stack.length, 0);
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
