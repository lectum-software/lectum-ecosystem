import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

const readProjectFile = (path: string) => readFile(join(process.cwd(), path), "utf8");

describe("Video service default runtime", () => {
  it("sobe API e worker no comando padrao para evitar job social sem consumidor", async () => {
    const [dockerfile, packageJsonContent, runtimeSource] = await Promise.all([
      readProjectFile("Dockerfile"),
      readProjectFile("package.json"),
      readProjectFile("src/all.ts"),
    ]);
    const packageJson = JSON.parse(packageJsonContent) as {
      scripts?: Record<string, string | undefined>;
    };

    assert.equal(packageJson.scripts?.start, "pnpm start:all");
    assert.equal(packageJson.scripts?.["start:all"], "node --enable-source-maps dist/all.js");
    assert.match(dockerfile, /CMD \["node", "--enable-source-maps", "dist\/all\.js"\]/);
    assert.match(runtimeSource, /startVideoApiRuntime/);
    assert.match(runtimeSource, /startVideoWorkerRuntime/);
    assert.doesNotMatch(runtimeSource, /\bspawn\(/);
  });
});
