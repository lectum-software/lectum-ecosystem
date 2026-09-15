import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const repositorySource = () => readFile("src/modules/video-assets/repository.ts", "utf8");

describe("VideoAssetRepository community_post_media associations", () => {
  it("autoriza playback publico quando o video esta no carrossel do post", async () => {
    const source = await repositorySource();

    assert.match(
      source,
      /media_items:\s*{\s*some:\s*{\s*deleted:\s*false,\s*media_type:\s*"video",\s*media_url:\s*reference/s,
    );
  });

  it("considera video do carrossel como anexo ativo", async () => {
    const source = await readFile("src/modules/video-assets/association-guard.ts", "utf8");

    assert.match(
      source,
      /media_items:\s*{\s*some:\s*{\s*deleted:\s*false,\s*media_url:\s*reference/s,
    );
    const repository = await repositorySource();
    assert.match(repository, /findVideoAssetAssociations\(prisma, asset\)/);
    assert.match(repository, /findVideoAssetAssociations\(transaction, asset\)/);
  });
});
