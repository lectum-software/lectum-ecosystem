import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("backend container package manager", () => {
  it("mantém o pnpm do manifesto alinhado ao Corepack da imagem", async () => {
    const [manifestSource, dockerfile] = await Promise.all([
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../Dockerfile", import.meta.url), "utf8"),
    ]);
    const manifest = JSON.parse(manifestSource);

    assert.equal(manifest.packageManager, "pnpm@10.33.0");
    assert.match(dockerfile, /corepack prepare pnpm@10\.33\.0 --activate/);
    assert.match(dockerfile, /COREPACK_HOME=\/corepack/);
    assert.match(dockerfile, /COREPACK_DEFAULT_TO_LATEST=0/);
    assert.match(dockerfile, /COREPACK_ENABLE_NETWORK=0/);
    assert.match(dockerfile, /USER node\s+#[\s\S]*RUN pnpm --version/);
  });
});
