import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectSharePostVideoMediaUrl } from "./share-render-media";

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
});
