import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pruneRemovedSourceMapsFromTraces } from "./source-map-traces.mjs";

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
