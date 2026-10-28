import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const read = (relative) => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

describe("backend container package manager", () => {
  it("mantém o pnpm do manifesto alinhado ao Corepack da imagem", async () => {
    const [manifestSource, dockerfile] = await Promise.all([
      read("package.json"),
      read("Dockerfile"),
    ]);
    const manifest = JSON.parse(manifestSource);

    assert.equal(manifest.packageManager, "pnpm@10.33.0");
    assert.match(dockerfile, /corepack prepare pnpm@10\.33\.0 --activate/);
    assert.match(dockerfile, /COREPACK_HOME=\/corepack/);
    assert.match(dockerfile, /COREPACK_DEFAULT_TO_LATEST=0/);
    assert.match(dockerfile, /COREPACK_ENABLE_NETWORK=0/);
    assert.match(dockerfile, /USER node\s+#[\s\S]*RUN pnpm --version/);
  });

  it("fixa Node 24.22.1 em Debian Bookworm e restringe o manifesto à mesma linha LTS", async () => {
    const [manifestSource, dockerfile] = await Promise.all([
      read("package.json"),
      read("Dockerfile"),
    ]);
    const manifest = JSON.parse(manifestSource);

    assert.equal(manifest.engines.node, ">=24.22.1 <25");
    assert.match(dockerfile, /^FROM node:24\.22\.1-bookworm-slim@sha256:[a-f0-9]{64} AS base$/m);
  });

  it("compartilha a mesma base entre instalação, compilação e runtime nativo", async () => {
    const dockerfile = await read("Dockerfile");
    const stages = [...dockerfile.matchAll(/^FROM (\S+) AS (\S+)$/gm)].map(([, source, name]) => ({
      source,
      name,
    }));

    assert.equal(stages.length, 4);
    assert.equal(stages[0].name, "base");
    assert.deepEqual(stages.slice(1), [
      { source: "base", name: "deps" },
      { source: "deps", name: "builder" },
      { source: "base", name: "runner" },
    ]);

    const deps = dockerfile.split("FROM base AS deps")[1].split("FROM deps AS builder")[0];
    const builder = dockerfile.split("FROM deps AS builder")[1].split("FROM base AS runner")[0];
    const runner = dockerfile.split("FROM base AS runner")[1];

    assert.match(deps, /pnpm install --frozen-lockfile/);
    assert.match(builder, /^RUN pnpm build$/m);
    assert.match(runner, /apt-get install[^\n]*\bopenssl\b/);
    assert.match(runner, /^COPY --from=deps \/app\/node_modules \.\/node_modules$/m);
    assert.match(runner, /^RUN pnpm prune --prod$/m);
    assert.match(runner, /^COPY --from=builder \/app\/dist \.\/dist$/m);
    assert.ok(runner.indexOf("RUN pnpm prune --prod") < runner.indexOf("USER node"));
    assert.match(runner, /^USER node$/m);
    assert.match(runner, /^CMD \["\.\/scripts\/docker-entrypoint\.sh"\]$/m);
  });

  it("exige observação de corpo antes do teste loopback real no runtime não privilegiado", async () => {
    const dockerfile = await read("Dockerfile");
    const runner = dockerfile.split("FROM base AS runner")[1];
    const gate = runner.match(
      /^RUN node -e '([^']+)' \\\r?\n\s+&& node --test dist\/modules\/billing\/payment-gateway\/outbound-transport\.test\.js$/m,
    );

    assert.ok(gate, "O gate Undici e o teste real devem compartilhar um RUN encadeado por &&");
    assert.equal(
      gate[1],
      'const [major, minor] = (process.versions.undici || "0.0").split(".").map(Number); if (!(major > 7 || (major === 7 && minor >= 11))) process.exit(1)',
    );
    const precedingUsers = [...runner.slice(0, gate.index).matchAll(/^USER (\S+)$/gm)];
    assert.equal(precedingUsers.at(-1)?.[1], "node");
    assert.ok(runner.indexOf("COPY --from=builder /app/dist ./dist") < gate.index);
    assert.ok(runner.indexOf("RUN pnpm prune --prod") < gate.index);
  });
});
