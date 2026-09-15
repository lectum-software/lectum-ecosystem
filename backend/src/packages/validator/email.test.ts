import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import express from "express";
import { createInstance } from "i18next";
import translation from "../../../locales/pt/translation.json";
import zodMessages from "../../../locales/pt/zod.json";
import { validator } from "./index";

let server: Server;
let base: string;

before(async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: "pt",
    fallbackLng: "pt",
    resources: { pt: { translation, zod: zodMessages } },
  });
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    request.language = "pt";
    next();
  });
  for (const optional of [false, true]) {
    app.post(
      optional ? "/optional" : "/required",
      validator({ body: [{ key: "email", method: "email", optional }] }, i18n),
      (request, response) => response.json(request.b),
    );
  }
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

const validate = async (body: unknown, path = "/required") => {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  const data = (await response.json()) as {
    email?: string;
    errors?: { body?: { email?: string } };
  };
  return { status: response.status, body: data };
};

test("validador de e-mail aceita aliases e domínios longos usados pelo frontend", async () => {
  for (const email of [
    "audit+paciente@example.com",
    "audit@example.technology",
    "o'neal@example.com",
  ]) {
    const result = await validate({ email });
    assert.equal(result.status, 200);
    assert.equal(result.body.email, email);
  }
});

test("normaliza caixa sem remover sufixo, pontos ou confundir identidades", async () => {
  const result = await validate({ email: "Audit.Name+PSI@Example.com" });
  assert.equal(result.status, 200);
  assert.equal(result.body.email, "audit.name+psi@example.com");
});

test("recusa estruturas inválidas com mensagem PT-BR sem repetir entrada", async () => {
  for (const email of [
    ".audit@example.com",
    "audit..name@example.com",
    "audit@.com",
    "audit@@example.com",
    "audit name@example.com",
    "audit@example",
    "audit@example.com\n",
  ]) {
    const result = await validate({ email });
    assert.equal(result.status, 400);
    assert.equal(result.body.errors?.body?.email, "E-mail inválido");
    assert.equal(JSON.stringify(result.body).includes(email), false);
  }
});

test("preserva obrigatório, omissão opcional e recusa de campo vazio", async () => {
  for (const body of [{}, { email: "" }, { email: null }]) {
    assert.equal((await validate(body)).status, 400);
  }
  const omitted = await validate({}, "/optional");
  assert.equal(omitted.status, 200);
  assert.deepEqual(omitted.body, {});
  assert.equal((await validate({ email: "" }, "/optional")).status, 400);
});
