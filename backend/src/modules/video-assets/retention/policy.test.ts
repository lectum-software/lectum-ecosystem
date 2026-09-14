import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseVideoRetentionArguments } from "@/operations/video-assets/retention-arguments";
import {
  isLegacyR2VideoKey,
  isVideoRetentionReviewDue,
  r2InventoryReference,
  shouldRetainCanceledVideo,
  videoRetentionIdentity,
} from "./policy";

describe("retenção conservadora de vídeos", () => {
  it("identidade é idempotente e separa bucket/provider/objeto", () => {
    const id = videoRetentionIdentity("cloudflare_r2", "a", "video.mp4");
    assert.equal(id, videoRetentionIdentity("cloudflare_r2", "a", "video.mp4"));
    assert.notEqual(id, videoRetentionIdentity("cloudflare_r2", "b", "video.mp4"));
    assert.notEqual(id, videoRetentionIdentity("cloudflare_stream", "a", "video.mp4"));
    assert.match(id, /^[a-f0-9]{64}$/);
    assert.match(r2InventoryReference("a", "video.mp4"), /^[a-f0-9]{16}$/);
  });

  it("data de revisão é opcional, sem prazo automático", () => {
    const now = new Date("2026-09-14T00:00:00Z");
    assert.equal(isVideoRetentionReviewDue(null, now), false);
    assert.equal(isVideoRetentionReviewDue(now, now), true);
    assert.equal(isVideoRetentionReviewDue(new Date("2026-09-15T00:00:00Z"), now), false);
  });

  it("preserva vídeo pronto mesmo se um evento posterior tiver mudado o estado", () => {
    assert.equal(shouldRetainCanceledVideo({ ready_at: null, status: "ready" }), true);
    assert.equal(shouldRetainCanceledVideo({ ready_at: new Date(), status: "error" }), true);
    assert.equal(shouldRetainCanceledVideo({ ready_at: null, status: "uploading" }), false);
  });

  it("separa vídeo legado de capas e avatares", () => {
    assert.equal(isLegacyR2VideoKey("psychologist/video/a.mov"), true);
    assert.equal(isLegacyR2VideoKey("posts/share-artifacts/a.mp4"), true);
    assert.equal(isLegacyR2VideoKey("psychologist/video-cover/a.png"), false);
    assert.equal(isLegacyR2VideoKey("psychologist/avatar/a.png"), false);
  });

  it("CLI começa sem escrita e exige confirmação explícita para apply", () => {
    const options = parseVideoRetentionArguments(["--catalog-r2"]);
    assert.equal(options?.apply, false);
    assert.equal(options?.reviewAfter, undefined);
    assert.equal(options?.limit, 5);
    assert.throws(() => parseVideoRetentionArguments(["--catalog-r2", "--apply"]));
    assert.equal(
      parseVideoRetentionArguments(["--catalog-r2", "--apply", "--confirm=homolog"])?.confirmation,
      "homolog",
    );
  });

  it("recusa flags ambíguas, datas inválidas, purge, limite excessivo e cursor indevido", () => {
    for (const args of [
      ["--catalog-r2", "--list"],
      ["--catalog-r2", "--apply=false"],
      ["--catalog-r2", "--confirm=homolog"],
      ["--list", "--limit=51"],
      ["--list", "--purge"],
      ["--list", "--apply", "--confirm=homolog"],
      ["--catalog-r2", "--review-after=2026-02-30"],
      ["--list", "--after=wrong"],
      ["--catalog-r2", "--limit=1", "--limit=2"],
    ])
      assert.throws(() => parseVideoRetentionArguments(args));
    assert.equal(
      parseVideoRetentionArguments([
        "--catalog-r2",
        "--review-after=2027-01-01",
      ])?.reviewAfter?.toISOString(),
      "2027-01-01T00:00:00.000Z",
    );
  });

  it("catálogo não possui comandos de escrita no provider ou purge", () => {
    const source = readFileSync("src/modules/video-assets/retention/r2-inventory.ts", "utf8");
    assert.doesNotMatch(
      source,
      /DeleteObject|PutObject|CopyObject|AbortMultipart|deleteVideo|fetch\(/,
    );
    const bootstrap = readFileSync("src/main/server/bootstrap.ts", "utf8");
    assert.doesNotMatch(bootstrap, /PostShareArtifactCleanup|retention|catalogLegacyR2/);
    const retired = readFileSync("src/modules/video-assets/lifecycle.ts", "utf8");
    assert.doesNotMatch(retired, /deleteVideo|deleteRetiredProviderVideos/);
  });
});
