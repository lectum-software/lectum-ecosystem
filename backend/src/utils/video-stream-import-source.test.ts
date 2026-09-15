import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  videoStreamImportObjectKey,
  videoStreamImportSourceToken,
  videoStreamImportSourceUrl,
} from "./video-stream-import-source";

describe("Cloudflare Stream import source", () => {
  it("codifica uma chave permitida em path opaco sem extensão cacheável", () => {
    const key = "psychologist/video/profile-video.mp4";
    const token = videoStreamImportSourceToken(key);
    assert.ok(token);
    assert.doesNotMatch(token, /[./]/);
    assert.equal(videoStreamImportObjectKey(token), key);

    const url = videoStreamImportSourceUrl(key, {
      baseUrl: "https://homolog-api.lectum.com.br",
      productionRuntime: true,
    });
    assert.equal(url, `https://homolog-api.lectum.com.br/public/video-stream-import/v1/${token}`);
  });

  it("aceita somente os prefixos de vídeo legado conhecidos", () => {
    assert.ok(videoStreamImportSourceToken("posts/media/community-video.mov"));
    assert.equal(videoStreamImportSourceToken("patient/avatar/avatar.mp4"), null);
    assert.equal(videoStreamImportSourceToken("posts/media/../private/video.mp4"), null);
    assert.equal(videoStreamImportSourceToken("posts\\media\\video.mp4"), null);
  });

  it("recusa token adulterado, não canônico ou UTF-8 inválido", () => {
    const token = videoStreamImportSourceToken("posts/media/video.webm");
    assert.ok(token);
    assert.equal(videoStreamImportObjectKey(`${token}=`), null);
    assert.equal(videoStreamImportObjectKey(`${token}A`), null);
    assert.equal(videoStreamImportObjectKey("_w"), null);
  });

  it("falha fechado sem BASE pública HTTPS", () => {
    assert.equal(
      videoStreamImportSourceUrl("posts/media/video.mp4", {
        baseUrl: "http://localhost:3001",
        productionRuntime: true,
      }),
      null,
    );
  });
});
