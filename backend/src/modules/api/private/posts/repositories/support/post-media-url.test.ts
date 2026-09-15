import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { isPublicPostMediaUrl } from "./post-media-url";

describe("community post/reply media URL admission", () => {
  let previousBase: string | undefined;
  before(() => {
    previousBase = process.env.BASE;
    process.env.BASE = "https://api.lectum.test";
  });
  after(() => {
    if (previousBase === undefined) delete process.env.BASE;
    else process.env.BASE = previousBase;
  });

  it("aceita somente a origem configurada para URLs absolutas", () => {
    assert.equal(
      isPublicPostMediaUrl("https://api.lectum.test/public/files/posts/media/video.mp4"),
      true,
    );
    for (const origin of [
      "https://api.lectum.test.attacker.invalid",
      "https://api.lectum.test@attacker.invalid",
      "https://user:password@api.lectum.test",
      "https://api.lectum.test:444",
      "http://api.lectum.test",
    ]) {
      assert.equal(isPublicPostMediaUrl(`${origin}/public/files/posts/media/video.mp4`), false);
    }
  });

  it("preserva referências relativas geradas pelo upload", () => {
    assert.equal(isPublicPostMediaUrl("/public/files/posts/media/image.webp"), true);
    assert.equal(isPublicPostMediaUrl("/public/files/posts/media/video%20novo.mp4"), true);
  });

  it("recusa origem arbitrária mesmo com o prefixo esperado", () => {
    assert.equal(
      isPublicPostMediaUrl("https://attacker.invalid/public/files/posts/media/tracker.mp4"),
      false,
    );
    assert.equal(
      isPublicPostMediaUrl("http://127.0.0.1/public/files/posts/media/video.mp4"),
      false,
    );
  });

  it("recusa esquemas sem origem HTTP pública", () => {
    for (const scheme of ["file", "ftp", "javascript", "data"]) {
      assert.equal(isPublicPostMediaUrl(`${scheme}:/public/files/posts/media/video.mp4`), false);
    }
  });

  it("recusa desvio do prefixo, query, fragmento e componentes ambíguos", () => {
    for (const value of [
      "/public/files/posts/media/../../private/document.pdf",
      "/public/files/posts/media/%2e%2e/private.jpg",
      "/public/files/posts/media/%2e%2e%2fprivate.jpg",
      "/public/files/posts/media/video.mp4?token=opaque",
      "/public/files/posts/media/video.mp4#fragment",
      "/public/files/posts/media/\\..\\private.jpg",
      "/public/files/posts/media/\nvideo.mp4",
      "/public/files/posts/media/",
      "/public/files/posts/media/%",
      "//attacker.invalid/public/files/posts/media/video.mp4",
      "/api/private/video-assets/asset/playback",
    ]) {
      assert.equal(isPublicPostMediaUrl(value), false);
    }
  });
});
