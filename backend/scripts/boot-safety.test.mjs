import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const BOOT_SAFETY_PROCESS_TIMEOUT_MS = 60_000;

test("boot com env inválida falha sem stack, segredo ou detalhes técnicos", () => {
  const secretMarker = "must-not-appear-in-output";
  const result = spawnSync(process.execPath, ["--import", "tsx", "src/index.ts"], {
    cwd: path.resolve(process.cwd()),
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: secretMarker,
      JWT_SECRET_KEY: secretMarker,
      NODE_ENV: "production",
      SENTRY_DSN: "",
    },
    timeout: BOOT_SAFETY_PROCESS_TIMEOUT_MS,
  });
  const output = `${result.stdout}${result.stderr}`;

  assert.equal(result.status, 1);
  assert.match(output, /Não foi possível iniciar o backend com segurança\./);
  assert.doesNotMatch(output, new RegExp(secretMarker));
  assert.doesNotMatch(output, /ZodError|node_modules|at\s+\S+\s+\(/);
});

test("falhas fatais sem DSN válido usam handlers únicos e saída sanitizada", async (t) => {
  const sentryModuleUrl = pathToFileURL(
    path.resolve(process.cwd(), "src/infra/observability/sentry.ts"),
  ).href;
  const scenarios = [
    {
      dsn: "",
      name: "uncaughtException",
      trigger: "setImmediate(() => { throw new Error(secretMarker); });",
    },
    {
      dsn: "not-a-valid-dsn",
      name: "unhandledRejection",
      trigger: "void Promise.reject(new Error(secretMarker));",
    },
  ];

  for (const scenario of scenarios) {
    await t.test(scenario.name, () => {
      const secretMarker = `fatal-secret-${scenario.name}`;
      const script = `
        const { initializeSentry } = await import(${JSON.stringify(sentryModuleUrl)});
        const uncaughtBefore = process.listenerCount("uncaughtException");
        const rejectionBefore = process.listenerCount("unhandledRejection");
        initializeSentry();
        initializeSentry();
        if (
          process.listenerCount("uncaughtException") !== uncaughtBefore + 1 ||
          process.listenerCount("unhandledRejection") !== rejectionBefore + 1
        ) {
          console.log("fatal-handler-count-invalid");
          process.exit(2);
        }
        console.log("fatal-handler-count-ok");
        const secretMarker = ${JSON.stringify(secretMarker)};
        ${scenario.trigger}
      `;
      const result = spawnSync(
        process.execPath,
        ["--import", "tsx", "--input-type=module", "--eval", script],
        {
          cwd: path.resolve(process.cwd()),
          encoding: "utf8",
          env: {
            ...process.env,
            NODE_ENV: "test",
            SENTRY_DSN: scenario.dsn,
          },
          timeout: BOOT_SAFETY_PROCESS_TIMEOUT_MS,
        },
      );
      const output = `${result.stdout}${result.stderr}`;

      assert.equal(result.status, 1);
      assert.match(output, /fatal-handler-count-ok/);
      assert.match(output, /\[PROCESS\] O backend será encerrado após uma falha não tratada\./);
      assert.doesNotMatch(output, new RegExp(secretMarker));
      assert.doesNotMatch(output, /(?:node_modules|Error:|\bat\s+[^\n]+:\d+:\d+)/);
    });
  }
});
