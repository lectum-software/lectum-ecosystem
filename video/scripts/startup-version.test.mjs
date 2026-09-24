import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { it } from "node:test";
import { promisify } from "node:util";
import { VIDEO_SERVICE_VERSION } from "../src/config/version.ts";

it("registra a versao do artefato no log JSON de inicializacao da API", async () => {
  const source = await readFile("src/api.ts", "utf8");
  assert.match(source, /import \{ VIDEO_SERVICE_VERSION \} from "\.\/config\/version\.js"/u);
  assert.match(
    source,
    /logInfo\("video_api_started",\s*\{\s*operation: "listen",\s*status: "ready",\s*version: VIDEO_SERVICE_VERSION,/u,
  );
  const { stdout, stderr } = await promisify(execFile)(process.execPath, [
    "--import",
    "tsx",
    "--input-type=module",
    "-e",
    'import { logInfo } from "./src/http/logging.ts"; import { VIDEO_SERVICE_VERSION } from "./src/config/version.ts"; logInfo("video_api_started", { operation: "listen", status: "ready", version: VIDEO_SERVICE_VERSION });',
  ]);
  assert.equal(stderr, "");
  assert.deepEqual(JSON.parse(stdout), {
    event: "video_api_started",
    operation: "listen",
    status: "ready",
    version: VIDEO_SERVICE_VERSION,
  });
});
