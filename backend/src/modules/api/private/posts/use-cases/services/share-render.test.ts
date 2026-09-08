import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { selectSharePostVideoMediaUrl } from "./share-render-media";
import { resolveLegacyPostMediaSourceUrlForRender } from "./share-render-source";

const shareRenderServiceSource = () =>
  readFile("src/modules/api/private/posts/use-cases/services/share-render.ts", "utf8");

describe("post share render media selection", () => {
  it("usa o primeiro item de midia do post quando ele e video", () => {
    assert.equal(
      selectSharePostVideoMediaUrl({
        media_items: [
          { media_type: "video", media_url: "/api/private/video-assets/video_123/playback" },
        ],
        media_type: null,
        media_url: null,
      }),
      "/api/private/video-assets/video_123/playback",
    );
  });

  it("preserva compatibilidade com video legado quando nao ha carrossel", () => {
    assert.equal(
      selectSharePostVideoMediaUrl({
        media_items: [],
        media_type: "video",
        media_url: "/public/files/posts/media/legacy.mp4",
      }),
      "/public/files/posts/media/legacy.mp4",
    );
  });

  it("nao tenta renderizar quando o primeiro item do carrossel nao e video", () => {
    assert.equal(
      selectSharePostVideoMediaUrl({
        media_items: [
          { media_type: "image", media_url: "/public/files/posts/media/image.jpg" },
          { media_type: "video", media_url: "/api/private/video-assets/video_456/playback" },
        ],
        media_type: "video",
        media_url: "/public/files/posts/media/legacy.mp4",
      }),
      null,
    );
  });

  it("envia origem web segura ao servico de video para HLS privado", async () => {
    const source = await shareRenderServiceSource();

    assert.match(source, /source_origin:\s*target\.sourceOrigin/);
    assert.match(source, /streamPlaybackRequestOrigin/);
  });

  it("aceita URL absoluta legada de posts/media mesmo quando a BASE atual diverge", () => {
    const previousBase = process.env.BASE;
    process.env.BASE = "https://api-atual.example";

    try {
      assert.deepEqual(
        resolveLegacyPostMediaSourceUrlForRender(
          "https://api-legada.example/public/files/posts/media/video.mp4",
        ),
        {
          sourceOrigin: null,
          sourceUrl: "https://api-legada.example/public/files/posts/media/video.mp4",
        },
      );
    } finally {
      if (previousBase === undefined) {
        delete process.env.BASE;
      } else {
        process.env.BASE = previousBase;
      }
    }
  });

  it("mantem recusas de URL legada fora do prefixo publico de midia de post", () => {
    assert.equal(
      resolveLegacyPostMediaSourceUrlForRender(
        "https://api-legada.example/public/files/patient/avatar/file.mp4",
      ),
      null,
    );
    assert.equal(
      resolveLegacyPostMediaSourceUrlForRender(
        "http://api-legada.example/public/files/posts/media/video.mp4",
      ),
      null,
    );
    assert.equal(
      resolveLegacyPostMediaSourceUrlForRender(
        "https://api-legada.example/public/files/posts/media/video.mp4?token=abc",
      ),
      null,
    );
  });
});
