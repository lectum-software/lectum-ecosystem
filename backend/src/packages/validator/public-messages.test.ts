import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { before, test } from "node:test";
import express from "express";
import { createInstance } from "i18next";
import translation from "../../../locales/pt/translation.json";
import zodMessages from "../../../locales/pt/zod.json";
import { setI18n } from "./i18n";
import { validator } from "./index";
import { z } from "./schema/_internal/validations/zod";

const i18n = createInstance();

before(async () => {
  await i18n.init({
    lng: "pt",
    fallbackLng: "pt",
    resources: { pt: { translation, zod: zodMessages } },
    interpolation: { escapeValue: false },
  });
  setI18n(i18n, "pt");
});

const firstMessage = (schema: z.ZodType, value: unknown) => {
  const result = schema.safeParse(value);
  assert.equal(result.success, false);
  if (result.success) throw new Error("VALIDATION_EXPECTED_FAILURE");
  return result.error.issues[0]?.message;
};

test("campos ausentes e tipos inválidos usam orientação sem tipos internos", () => {
  assert.equal(firstMessage(z.string(), undefined), "Este campo é obrigatório.");
  assert.equal(firstMessage(z.string(), null), "Este campo é obrigatório.");
  assert.equal(firstMessage(z.string(), 12), "Informe um valor válido.");
});

test("Zod 4 traduz limites, formato e seleção sem ecoar valores", () => {
  assert.equal(firstMessage(z.string().min(3), "a"), "Texto deve conter pelo menos 3 caracter(es)");
  assert.equal(
    firstMessage(z.string().max(2), "aaa"),
    "Texto pode conter no máximo 2 caracter(es)",
  );
  assert.equal(firstMessage(z.email(), "nao-e-email"), "E-mail inválido");
  assert.equal(firstMessage(z.enum(["a", "b"]), "segredo"), "Selecione uma opção válida.");
  assert.equal(
    firstMessage(z.object({}).strict(), { internal_flag: true }),
    "Revise os campos enviados.",
  );
});

test("mensagem específica de domínio continua com precedência", () => {
  assert.equal(firstMessage(z.string().min(2, "Informe seu nome."), ""), "Informe seu nome.");
});

test("comprimento fixo informa valor exato, não apenas mínimo ou máximo", () => {
  for (const value of ["a", "aaaa"]) {
    assert.equal(
      firstMessage(z.string().length(3), value),
      "Texto deve conter exatamente 3 caracter(es)",
    );
  }
  for (const value of [[1], [1, 2, 3]]) {
    assert.equal(
      firstMessage(z.array(z.number()).length(2), value),
      "Lista deve conter exatamente 2 elemento(s)",
    );
  }
});

test("validador HTTP real devolve erro inline PT-BR para login vazio", async () => {
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    request.language = "pt";
    next();
  });
  app.post(
    "/login",
    validator(
      {
        body: [
          { key: "email", method: "email" },
          { key: "password", method: "string" },
        ],
      },
      i18n,
    ),
    (_request, response) => response.sendStatus(204),
  );
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      status: 400,
      success: false,
      error: "Revise os dados informados.",
      errors: {
        body: { email: "Este campo é obrigatório.", password: "Este campo é obrigatório." },
      },
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("catálogos de mensagens não contêm acentos perdidos em pontos de interrogação", () => {
  for (const catalog of [translation, zodMessages]) {
    assert.doesNotMatch(JSON.stringify(catalog), /[A-Za-zÀ-ÿ]\?[A-Za-zÀ-ÿ]/u);
  }
});

test("orientações de sessão e verificação não expõem detalhes de implementação", () => {
  for (const key of [
    "device_not_found",
    "device_id_not_found",
    "token_not_authorized",
    "token_not_provided",
    "token_mal_formatted",
    "token_invalid",
    "token_device_not_authorized",
    "phone_verification_config_error",
    "phone_verification_sender_invalid",
    "cfp_provider_config_error",
  ] as const) {
    assert.doesNotMatch(translation.error[key], /token|twilio|provider|configura|\bID\b/i);
  }
});

test("mensagem de preenchimento alternativo interpola os nomes dos campos", () => {
  const message = i18n.getFixedT("pt", "zod")("errors.invalid_type_one_of_required_condition", {
    names: "E-mail",
    conjugation: "ou",
    last: "Telefone",
  });
  assert.equal(message, "Um dos campos E-mail ou Telefone deve ser preenchido");
});
