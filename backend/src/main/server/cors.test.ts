import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import express from "express";
import { createApiCors } from "./cors";

const frontendOrigin = "https://homolog.lectum.com.br";
const adminOrigin = "https://homolog.admin.lectum.com.br";
const uploadHeader = "x-lectum-video-upload-methods";
let server: Server;
let base: string;

before(async () => {
  const previous = process.env.WEB_URL;
  try {
    process.env.WEB_URL = `${frontendOrigin},${adminOrigin}`;
    // Somente transporte + middleware real; sem simular upload, autenticação ou provider.
    const app = express();
    app.use(createApiCors());
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  } finally {
    if (previous === undefined) delete process.env.WEB_URL;
    else process.env.WEB_URL = previous;
  }
});

after(async () => {
  if (!server) return;
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

const preflight = (origin: string, headers = `content-type,x-device,${uploadHeader}`) =>
  fetch(`${base}/api/private/video-assets/uploads`, {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": headers,
    },
    signal: AbortSignal.timeout(5_000),
  });

const allowedHeaders = (response: Response) =>
  (response.headers.get("access-control-allow-headers") ?? "")
    .toLowerCase()
    .split(",")
    .map((value) => value.trim());

test("preflight permite negociação basic/tus no frontend e Admin configurados", async () => {
  for (const origin of [frontendOrigin, adminOrigin]) {
    const response = await preflight(origin);
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
    assert.equal(response.headers.get("access-control-allow-credentials"), "true");
    assert.ok(response.headers.get("vary")?.includes("Origin"));
    assert.ok(response.headers.get("access-control-allow-methods")?.includes("POST"));
    for (const header of [uploadHeader, "content-type", "x-device"]) {
      assert.ok(allowedHeaders(response).includes(header));
    }
  }
});

test("preflight preserva cabeçalhos dos clientes anteriores sem exigir negociação", async () => {
  const previousHeaders = [
    "content-type",
    "authorization",
    "accept-language",
    "x-requested-with",
    "accept",
    "origin",
    "ngrok-skip-browser-warning",
    "x-device",
  ];
  const response = await preflight(frontendOrigin, previousHeaders.join(","));
  assert.equal(response.status, 204);
  for (const header of previousHeaders) assert.ok(allowedHeaders(response).includes(header));
});

test("preflight não libera origens não configuradas, sufixos ou origem opaca", async () => {
  for (const origin of [
    "https://untrusted.example",
    "https://homolog.lectum.com.br.untrusted.example",
    "null",
  ]) {
    const response = await preflight(origin);
    // 204 sozinho não basta: o navegador exige Allow-Origin correspondente.
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  }
});

test("preflight não reflete headers arbitrários nem wildcard", async () => {
  const response = await preflight(frontendOrigin, `${uploadHeader},x-untrusted-header`);
  assert.ok(allowedHeaders(response).includes(uploadHeader));
  assert.equal(allowedHeaders(response).includes("x-untrusted-header"), false);
  assert.equal(allowedHeaders(response).includes("*"), false);
});

test("POST mantém CORS depois do preflight sem criar endpoint ou contornar autenticação", async () => {
  const response = await fetch(`${base}/api/private/video-assets/uploads`, {
    method: "POST",
    headers: { Origin: frontendOrigin, "X-Lectum-Video-Upload-Methods": "basic,tus" },
    signal: AbortSignal.timeout(5_000),
  });
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("access-control-allow-origin"), frontendOrigin);
});
