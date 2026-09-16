import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
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
