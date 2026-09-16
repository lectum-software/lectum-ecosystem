import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  pruneRemovedSourceMapsFromFunctions,
  pruneRemovedSourceMapsFromTraces,
  removeBuildSourceMapLinks,
} from "./source-map-traces.mjs";

test("remove apenas referências a mapas do build, preservando dependências e metadados", async () => {
  const temp = await mkdtemp(join(tmpdir(), "lectum-traces-"));
  try {
    const root = join(temp, ".next");
    const dir = join(root, "server", "app");
    await mkdir(dir, { recursive: true });
    const manifest = join(dir, "page.js.nft.json");
    const runtimeFiles = [
      "../chunks/1.js",
      "../../../node_modules/package/index.js.map",
      "../../../.next-other/runtime.map",
      "../../../public/logo.png",
    ];
    await writeFile(
      manifest,
      JSON.stringify({
        version: 1,
        files: ["../chunks/1.js.map", "page.js.map", ...runtimeFiles],
        metadata: { keep: true },
      }),
    );
    await writeFile(join(dir, "unrelated.json"), "{}");
    assert.equal(
      await pruneRemovedSourceMapsFromTraces(root, [manifest, join(dir, "unrelated.json")]),
      2,
    );
    assert.deepEqual(JSON.parse(await readFile(manifest, "utf8")), {
      version: 1,
      files: runtimeFiles,
      metadata: { keep: true },
    });
    assert.equal(await pruneRemovedSourceMapsFromTraces(root, [manifest]), 0);
    await writeFile(manifest, JSON.stringify({ version: 1, files: [null] }));
    await assert.rejects(
      pruneRemovedSourceMapsFromTraces(root, [manifest]),
      /Invalid production trace/,
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("remove mapas symlink do adapter sem seguir diretórios ou apagar alvo externo", async () => {
  const temp = await mkdtemp(join(tmpdir(), "lectum-map-links-"));
  try {
    const root = join(temp, ".next");
    const output = join(root, "output", "functions", "page.func");
    const external = join(temp, "outside");
    await mkdir(output, { recursive: true });
    await mkdir(external);
    await writeFile(join(external, "keep.map"), "private-map");
    await symlink(join(root, "server", "chunks", "2442.js.map"), join(output, "2442.js.map"));
    await symlink(join(external, "keep.map"), join(output, "external.js.map"));
    await symlink(external, join(output, "dependencies"));
    await symlink(join(external, "keep.map"), join(output, "runtime.js"));
    assert.equal(await removeBuildSourceMapLinks(root), 2);
    assert.equal(await readFile(join(external, "keep.map"), "utf8"), "private-map");
    assert.equal(await readFile(join(output, "runtime.js"), "utf8"), "private-map");
    assert.equal(await removeBuildSourceMapLinks(root), 0);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

for (const app of ["", "frontend"]) {
  test(`limpa filePathMap do adapter (${app || "standalone"}) e seus hashes sem alterar runtime`, async () => {
    const temp = await mkdtemp(join(tmpdir(), "lectum-adapter-map-"));
    try {
      const root = join(temp, app, ".next");
      const output = join(root, "output", "functions", "nested", "page.func");
      await mkdir(output, { recursive: true });
      await writeFile(
        join(root, "required-server-files.json"),
        JSON.stringify({ config: { repoRoot: temp } }),
      );
      const manifest = join(output, ".vc-config.json");
      const map = join(app, ".next/server/chunks/2442.js.map");
      const runtime = join(app, ".next/server/chunks/2442.js");
      const keep = {
        [runtime]: runtime,
        "dependency.map": "node_modules/package/index.js.map",
        "other.map": join(app, ".next-other/keep.map"),
        "parent.map": "../outside/keep.map",
        // A chave de destino não determina o tipo do arquivo de origem.
        "runtime.map": runtime,
      };
      await writeFile(
        manifest,
        JSON.stringify({
          runtime: "nodejs22.x",
          handler: "launcher.cjs",
          framework: { slug: "nextjs" },
          filePathMap: { [map]: map, ...keep, renamed: join(root, "server/absolute.map") },
          fileHashes: { [map]: "map-hash", renamed: "other-map-hash", [runtime]: "runtime-hash" },
        }),
      );
      assert.equal(await pruneRemovedSourceMapsFromFunctions(root, [manifest]), 2);
      assert.deepEqual(JSON.parse(await readFile(manifest, "utf8")), {
        runtime: "nodejs22.x",
        handler: "launcher.cjs",
        framework: { slug: "nextjs" },
        filePathMap: keep,
        fileHashes: { [runtime]: "runtime-hash" },
      });
      assert.equal(await pruneRemovedSourceMapsFromFunctions(root, [manifest]), 0);
      await writeFile(manifest, JSON.stringify({ filePathMap: { bad: null } }));
      await assert.rejects(
        pruneRemovedSourceMapsFromFunctions(root, [manifest]),
        /Invalid production adapter file map/,
      );
      await writeFile(
        join(root, "required-server-files.json"),
        JSON.stringify({ config: { repoRoot: "relative" } }),
      );
      await assert.rejects(
        pruneRemovedSourceMapsFromFunctions(root, [manifest]),
        /Invalid production adapter root/,
      );
      assert.equal(await pruneRemovedSourceMapsFromFunctions(root, []), 0);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
}
