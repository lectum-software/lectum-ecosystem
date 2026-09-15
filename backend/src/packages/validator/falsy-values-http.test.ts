import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import express from "express";
import { createInstance } from "i18next";
import translation from "../../../locales/pt/translation.json";
import zodMessages from "../../../locales/pt/zod.json";
import { type IValidatorRequest, validator } from "./index";

let server: Server;
let base: string;

before(async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: "pt",
    fallbackLng: "pt",
    resources: {
      pt: {
        translation,
        zod: { ...zodMessages, names: { first: "Primeiro campo", second: "Segundo campo" } },
      },
    },
  });
  // Somente transporte local + middleware real; sem bootstrap, DB, providers ou geração de dados.
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    Object.assign(request, { language: "pt" });
    next();
  });
  const register = (path: string, fields: IValidatorRequest) => {
    app.post(path, validator(fields, i18n), (request, response) => response.json(request.b));
  };
  for (const optional of [false, true]) {
    for (const nullable of [false, true]) {
      register(`/cpf/${optional}/${nullable}`, {
        body: [{ key: "cpf", method: "cpf", optional, nullable }],
      });
      register(`/numeric/${optional}/${nullable}`, {
        body: [{ key: "value", method: "numeric", min: 0, max: 0, optional, nullable }],
      });
      register(`/string/${optional}/${nullable}`, {
        body: [{ key: "value", method: "string", min: 0, max: 0, optional, nullable }],
      });
    }
  }
  for (const method of ["numeric", "boolean"] as const) {
    for (const type of [
      "mutual",
      "reverse",
      "oneOfRequired",
      "major",
      "majorOrEqual",
      "equal",
    ] as const) {
      register(`/conditions/${method}/${type}`, {
        body: ["first", "second"].map((key) => ({ key, method, optional: true, nullable: true })),
        relations: { body: [{ keys: ["first", "second"], type }] },
      });
    }
  }
  app.get(
    "/bounds/:value",
    validator(
      {
        params: [{ key: "value", method: "numeric", min: 0, max: 0 }],
        query: [{ key: "value", method: "numeric", min: 0, max: 0, optional: true }],
      },
      i18n,
    ),
    (request, response) => response.json({ params: request.p, query: request.q }),
  );
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (!server) return;
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

const validate = async (path: string, body?: unknown) => {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "POST",
    // Ativa refinements também quando o runner externo usa NODE_ENV=test, sem alterar env.
    headers: { "Content-Type": "application/json", "x-refine": "true" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
};

test("HTTP recusa os dez CPFs repetidos com erro PT-BR sem ecoar a entrada", async () => {
  for (let digit = 0; digit <= 9; digit++) {
    const group = String(digit).repeat(3);
    const cpf = `${group}.${group}.${group}-${String(digit).repeat(2)}`;
    for (const path of ["/cpf/false/false", "/cpf/true/true"]) {
      const result = await validate(path, { cpf });
      assert.equal(result.status, 400);
      assert.deepEqual(result.body, {
        status: 400,
        success: false,
        error: "Revise os dados informados.",
        errors: { body: { cpf: "CPF deve ser válido" } },
      });
      assert.equal(JSON.stringify(result.body).includes(cpf), false);
    }
  }
});

test("HTTP CPF preserva obrigatório, optional, nullable e vazio convertido para null", async () => {
  for (const optional of [false, true]) {
    for (const nullable of [false, true]) {
      const path = `/cpf/${optional}/${nullable}`;
      assert.equal((await validate(path, {})).status, optional ? 200 : 400);
      for (const cpf of [null, ""]) {
        const result = await validate(path, { cpf });
        assert.equal(result.status, nullable ? 200 : 400);
        if (nullable) assert.deepEqual(result.body, { cpf: null });
      }
      for (const cpf of ["00000000000", "000.000.000-01", 0, false]) {
        assert.equal((await validate(path, { cpf })).status, 400);
      }
    }
  }
});

test("HTTP numeric rejeita valores fora dos limites zero com erros PT-BR", async () => {
  for (const value of [-1, "-1", 1, "1"]) {
    const result = await validate("/numeric/true/true", { value });
    assert.equal(result.status, 400);
    assert.deepEqual(result.body, {
      status: 400,
      success: false,
      error: "Revise os dados informados.",
      errors: {
        body: {
          value:
            Number(value) < 0
              ? "Número deve ser maior ou igual a 0"
              : "Número deve ser menor ou igual a 0",
        },
      },
    });
  }
});

test("HTTP numeric mantém omissão, null e coerção legada para zero", async () => {
  for (const optional of [false, true]) {
    for (const nullable of [false, true]) {
      const path = `/numeric/${optional}/${nullable}`;
      assert.equal((await validate(path, {})).status, optional ? 200 : 400);
      const result = await validate(path, { value: null });
      assert.equal(result.status, nullable ? 200 : 400);
      if (nullable) assert.deepEqual(result.body, { value: null });
      for (const value of [0, "0", false, "", " "]) {
        const result = await validate(path, { value });
        assert.equal(result.status, 200);
        assert.deepEqual(result.body, { value: 0 });
      }
    }
  }
});

test("HTTP string max zero não permite texto nem muda as regras de vazio", async () => {
  for (const optional of [false, true]) {
    for (const nullable of [false, true]) {
      const path = `/string/${optional}/${nullable}`;
      const result = await validate(path, { value: "entrada-inválida-de-teste" });
      assert.equal(result.status, 400);
      assert.deepEqual(result.body.errors, {
        body: { value: "Texto pode conter no máximo 0 caracter(es)" },
      });
      assert.equal(JSON.stringify(result.body).includes("entrada-inválida-de-teste"), false);
      assert.equal((await validate(path, {})).status, optional ? 200 : 400);
      for (const value of [null, ""]) {
        const result = await validate(path, { value });
        assert.equal(result.status, nullable ? 200 : 400);
        if (nullable) assert.deepEqual(result.body, { value: null });
      }
    }
  }
});

for (const method of ["numeric", "boolean"] as const) {
  const value = method === "numeric" ? 0 : false;
  const serialized = method === "numeric" ? "0" : "false";

  test(`HTTP relações de presença reconhecem ${method} falsy e sua coerção`, async () => {
    for (const input of [value, serialized]) {
      const mutual = await validate(`/conditions/${method}/mutual`, {
        first: input,
        second: input,
      });
      assert.equal(mutual.status, 200);
      assert.deepEqual(mutual.body, { first: value, second: value });
      assert.equal((await validate(`/conditions/${method}/mutual`, { first: input })).status, 400);
      assert.equal((await validate(`/conditions/${method}/reverse`, { first: input })).status, 200);
      const reverse = await validate(`/conditions/${method}/reverse`, {
        first: input,
        second: input,
      });
      assert.equal(reverse.status, 400);
      assert.deepEqual(reverse.body.errors, {
        body: {
          first:
            "Os campos Primeiro campo e Segundo campo não podem ser preenchidos ao mesmo tempo",
          second:
            "Os campos Primeiro campo e Segundo campo não podem ser preenchidos ao mesmo tempo",
        },
      });
      assert.equal(
        (await validate(`/conditions/${method}/oneOfRequired`, { second: input })).status,
        200,
      );
    }
    assert.equal((await validate(`/conditions/${method}/oneOfRequired`, {})).status, 400);
    assert.equal(
      (await validate(`/conditions/${method}/oneOfRequired`, { first: null })).status,
      400,
    );
    assert.equal(
      (await validate(`/conditions/${method}/equal`, { first: value, second: value })).status,
      200,
    );
    assert.equal((await validate(`/conditions/${method}/equal`, { first: value })).status, 400);
  });
}

for (const type of ["major", "majorOrEqual"] as const) {
  test(`HTTP ${type} compara zero e false nas duas posições`, async () => {
    for (const body of [
      { first: -1, second: 0 },
      { first: 0, second: 1 },
    ]) {
      const result = await validate(`/conditions/numeric/${type}`, body);
      assert.equal(result.status, 400);
      assert.deepEqual(result.body.errors, {
        body: {
          second:
            type === "major"
              ? "O valor de Primeiro campo deve ser maior que Segundo campo"
              : "O valor de Primeiro campo deve ser maior ou igual a Segundo campo",
        },
      });
    }
    for (const body of [
      { first: 0, second: -1 },
      { first: 1, second: 0 },
      { first: 0, second: null },
    ]) {
      assert.equal((await validate(`/conditions/numeric/${type}`, body)).status, 200);
    }
    assert.equal(
      (await validate(`/conditions/boolean/${type}`, { first: false, second: true })).status,
      400,
    );
    assert.equal(
      (await validate(`/conditions/boolean/${type}`, { first: true, second: false })).status,
      200,
    );
    assert.equal(
      (await validate(`/conditions/numeric/${type}`, { first: "0", second: "0" })).status,
      type === "major" ? 400 : 200,
    );
  });
}

test("HTTP query e params também aplicam min/max zero antes do handler", async () => {
  const result = await validate("/bounds/0?value=0");
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { params: { value: 0 }, query: { value: 0 } });
  for (const path of ["/bounds/-1", "/bounds/1", "/bounds/0?value=-1", "/bounds/0?value=1"]) {
    assert.equal((await validate(path)).status, 400);
  }
});
