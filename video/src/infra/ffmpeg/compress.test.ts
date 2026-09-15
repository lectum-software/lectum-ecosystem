import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseVideoServiceConfig } from "../../config/env.js";
import { buildCompressionArguments } from "./compress.js";

const config = parseVideoServiceConfig({
  NODE_ENV: "test",
  REDIS_URL: "redis://localhost:6379/0",
  VIDEO_SERVICE_API_KEY: "x".repeat(32),
});

describe("FFmpeg compression command", () => {
  it("fixa codecs, faststart, metadata e limites sem construir shell", () => {
    const args = buildCompressionArguments({
      config,
      inputPath: "/safe/incoming/source",
      outputPath: "/safe/outputs/video.partial.mp4",
    });
    const command = args.join(" ");

    assert.match(command, /-c:v libx264/);
    assert.match(command, /-c:a aac/);
    assert.match(command, /-map 0:a:0\?/);
    assert.match(command, /-movflags \+faststart/);
    assert.match(command, /-map_metadata -1/);
    assert.match(command, /-map_chapters -1/);
    assert.match(command, /-fpsmax 30/);
    assert.match(command, /-protocol_whitelist file,pipe/);
    assert.equal(args.at(-1), "/safe/outputs/video.partial.mp4");
    assert.equal(args.includes("-nostdin"), true);
  });
});
