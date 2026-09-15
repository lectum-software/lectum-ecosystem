import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const backendRoot = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(new URL("../package.json", import.meta.url));

test("autenticação opcional distingue visitante de falha real do banco", () => {
  const isolatedDirectory = mkdtempSync(path.join(tmpdir(), "lectum-auth-failure-"));
  try {
    cpSync(path.join(backendRoot, "locales"), path.join(isolatedDirectory, "locales"), {
      recursive: true,
    });
    // Processo sem .env/credenciais do workspace. Prisma aponta exclusivamente
    // para um socket inexistente dentro deste diretório descartável: nenhuma
    // autenticação, resposta do banco ou implementação Passport é substituída.
    const databaseUrl = new URL("postgresql://audit:audit@localhost/audit");
    databaseUrl.searchParams.set("host", path.join(isolatedDirectory, "missing-postgres"));
    const script = `
      const assert = require('node:assert/strict');
      const { once } = require('node:events');
      const express = require(${JSON.stringify(require.resolve("express"))});
      const root = ${JSON.stringify(backendRoot)};
      const optionalAuth = require(root + '/src/modules/api/middlewares/optional-auth/index.ts').default;
      const privateAuth = require(root + '/src/modules/api/middlewares/_auth/index.ts').default;
      const { generateToken } = require(root + '/src/modules/api/middlewares/_auth/utils/generateToken.ts');
      const { prisma } = require(root + '/src/external/prisma/client.ts');
      const i18n = require(root + '/src/main/server/i18n.ts').default;
      (async () => {
        if (!i18n.isInitialized) await new Promise(resolve => i18n.on('initialized', resolve));
        const app = express();
        app.get('/optional', optionalAuth, (_req, res) => res.sendStatus(204));
        app.get('/private', privateAuth, (_req, res) => res.sendStatus(204));
        const server = app.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const base = 'http://127.0.0.1:' + server.address().port;
        const token = generateToken({id:'audit-account', email:'audit@example.invalid'}, 'user', 'audit-device');
        try {
          for (const headers of [{}, {'Authorization':'Bearer invalid', 'x-device':'audit-device'}]) {
            const response = await fetch(base + '/optional', {headers, signal: AbortSignal.timeout(5000)});
            assert.equal(response.status, 204);
            await response.arrayBuffer();
          }
          for (const route of ['/optional', '/private']) {
            const response = await fetch(base + route, {
              headers: {'Authorization':'Bearer ' + token, 'x-device':'audit-device'},
              signal: AbortSignal.timeout(5000)
            });
            console.log('AUTH_PROBE_STATUS', route, response.status);
            assert.equal(response.status, 503, route + ' deve informar indisponibilidade');
            assert.deepEqual(await response.json(), {
              status:503, success:false, code:'auth_unavailable',
              error:'Autenticação indisponível. Tente novamente em instantes.'
            });
          }
          console.log('OPTIONAL_AUTH_FAILURE_OK');
        } finally {
          server.closeAllConnections();
          await new Promise(resolve => server.close(resolve));
          await prisma.$disconnect();
        }
      })().catch(() => { console.error('OPTIONAL_AUTH_FAILURE_FAILED'); process.exitCode = 1; });
    `;
    const result = spawnSync(
      process.execPath,
      ["--require", require.resolve("tsx/cjs"), "-e", script],
      {
        cwd: isolatedDirectory,
        encoding: "utf8",
        env: {
          NODE_ENV: "test",
          DATABASE_URL: databaseUrl.href,
          JWT_SECRET_KEY: "isolated-auth-test-not-a-deployed-secret",
          GOOGLE_CLIENT_ID_API_USER: "unused-in-jwt-test",
          GOOGLE_CLIENT_SECRET_API_USER: "unused-in-jwt-test",
          TSX_TSCONFIG_PATH: path.join(backendRoot, "tsconfig.json"),
        },
        timeout: 30_000,
      },
    );
    const observedStatuses =
      result.stdout.match(/AUTH_PROBE_STATUS \/(?:optional|private) \d{3}/g) ?? [];
    assert.equal(
      result.status,
      0,
      `Middleware deve responder sem falha: ${observedStatuses.join(", ")}`,
    );
    assert.match(result.stdout, /OPTIONAL_AUTH_FAILURE_OK/);
    assert.doesNotMatch(
      result.stdout + result.stderr,
      /audit@example|audit-device|isolated-auth-test|PrismaClient|postgresql:|missing-postgres|node_modules/,
    );
  } finally {
    rmSync(isolatedDirectory, { recursive: true, force: true });
  }
});
