import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

// Disposable scanner fixtures only; no application code, env or provider is loaded.
const runScanner = (source, app = "backend") => {
  const root = mkdtempSync(path.join(tmpdir(), "lectum-env-policy-"));
  try {
    mkdirSync(path.join(root, "scripts"));
    copyFileSync(
      new URL("./check-env-examples.mjs", import.meta.url),
      path.join(root, "scripts/check-env-examples.mjs"),
    );
    writeFileSync(path.join(root, "scripts/dev.mjs"), "");
    for (const name of ["backend", "frontend", "admin", "video"]) {
      mkdirSync(path.join(root, name));
      writeFileSync(path.join(root, name, ".env.example"), "");
      if (name === "frontend" || name === "admin") {
        writeFileSync(
          path.join(root, name, "next.config.ts"),
          "const env = { LECTUM_APP_VERSION: packageMetadata.version };\n",
        );
      }
    }
    writeFileSync(path.join(root, app, "policy-fixture.ts"), source);
    try {
      return {
        status: 0,
        output: execFileSync(
          process.execPath,
          [path.join(root, "scripts/check-env-examples.mjs")],
          { encoding: "utf8", stdio: "pipe" },
        ),
      };
    } catch (error) {
      if (!Number.isInteger(error.status)) throw error;
      return { status: error.status, output: `${error.stdout}${error.stderr}` };
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

test("PATH do sistema não exige variável de produto", () => {
  assert.equal(runScanner("const path = process.env.PATH;\n").status, 0);
});

test("nova variável de aplicação continua exigindo documentação", () => {
  const result = runScanner("const key = process.env.AUDIT_UNDOCUMENTED_KEY;\n");
  assert.equal(result.status, 1);
  assert.match(result.output, /AUDIT_UNDOCUMENTED_KEY.*não está em backend\/\.env.example/u);
});

test("PATH continua proibida em módulo client", () => {
  const result = runScanner('"use client";\nconst path = process.env.PATH;\n', "frontend");
  assert.equal(result.status, 1);
  assert.match(result.output, /PATH não pode ser lida em módulo de navegador/u);
});
