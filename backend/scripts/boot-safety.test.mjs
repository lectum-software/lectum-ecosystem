import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

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
    },
    timeout: 10_000,
  });
  const output = `${result.stdout}${result.stderr}`;

  assert.equal(result.status, 1);
  assert.match(output, /Não foi possível iniciar o backend com segurança\./);
  assert.doesNotMatch(output, new RegExp(secretMarker));
  assert.doesNotMatch(output, /ZodError|node_modules|at\s+\S+\s+\(/);
});
