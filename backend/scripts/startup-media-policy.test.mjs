import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (relative) => readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

describe("inicialização sem manutenção de mídia", () => {
  it("bootstrap não inicia nem importa backfill de mídia", () => {
    const bootstrap = read("src/main/server/bootstrap.ts");
    assert.doesNotMatch(bootstrap, /r2-migration|R2ToStream.*Migration/);
    for (const filename of ["startup.ts", "startup-policy.ts"]) {
      assert.equal(
        existsSync(
          new URL(`../src/modules/video-assets/r2-migration/${filename}`, import.meta.url),
        ),
        false,
      );
    }
    assert.doesNotMatch(read("src/modules/video-assets/r2-migration/index.ts"), /startup/);
    assert.doesNotMatch(read(".env.example"), /^R2_TO_STREAM_STARTUP_MIGRATION=/m);
  });

  it("entrypoint conserva Prisma e inicia somente a API", () => {
    const entrypoint = read("scripts/docker-entrypoint.sh");
    const scripts = JSON.parse(read("package.json")).scripts;
    assert.match(entrypoint, /prisma migrate deploy/);
    assert.match(entrypoint, /exec node --enable-source-maps dist\/index\.js/);
    assert.doesNotMatch(entrypoint, /r2-to-stream|R2_TO_STREAM/);
    assert.equal(scripts.start, "node --enable-source-maps dist/index.js");
  });

  it("migração permanece como operação explícita fora do start", () => {
    const scripts = JSON.parse(read("package.json")).scripts;
    assert.equal(
      scripts["video:migrate-r2-to-stream"],
      "node --enable-source-maps dist/operations/video-assets/migrate-r2-to-stream.js",
    );
    const operation = read("src/operations/video-assets/migrate-r2-to-stream.ts");
    assert.match(operation, /parseR2ToStreamArguments/);
    assert.match(operation, /assertApplySafety/);
    assert.match(operation, /acquireR2ToStreamMigrationLock/);
  });
});
