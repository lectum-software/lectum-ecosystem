import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { swaggerGenerate } from "./save";

test("artefato Swagger usa servidor relativo e nunca incorpora BASE do ambiente", async () => {
  const previousBase = process.env.BASE;
  const previousCwd = process.cwd();
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "lectum-swagger-"));
  const internalEnvironmentUrl = "https://internal-environment.invalid:9443";

  try {
    process.env.BASE = internalEnvironmentUrl;
    process.chdir(temporaryDirectory);

    await swaggerGenerate(
      {
        description: "Documento de teste",
        outputFile: "api.json",
        title: "Lectum",
        version: "1.0.0",
      },
      [],
      "api",
    );

    const artifact = await readFile(path.join(temporaryDirectory, "swagger/api.json"), "utf8");
    const parsed = JSON.parse(artifact) as { servers?: Array<{ url?: string }> };

    assert.deepEqual(parsed.servers, [{ url: "/" }]);
    assert.equal(artifact.includes(internalEnvironmentUrl), false);
  } finally {
    process.chdir(previousCwd);
    if (previousBase === undefined) delete process.env.BASE;
    else process.env.BASE = previousBase;
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
});

test("imagem publicada não embarca o catálogo Swagger versionado", async () => {
  const dockerfile = await readFile(path.resolve(__dirname, "../../../../Dockerfile"), "utf8");

  assert.doesNotMatch(dockerfile, /^\s*COPY\s+swagger(?:\s|$)/mu);
});
