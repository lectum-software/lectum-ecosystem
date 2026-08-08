import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchesDeclaredFileType } from "./file-signature";

describe("matchesDeclaredFileType", () => {
  it("reconhece assinaturas de imagens permitidas", () => {
    assert.equal(matchesDeclaredFileType(Buffer.from([0xff, 0xd8, 0xff]), "image/jpeg"), true);
    assert.equal(
      matchesDeclaredFileType(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        "image/png",
      ),
      true,
    );
  });

  it("rejeita conteúdo incompatível com o MIME declarado", () => {
    assert.equal(matchesDeclaredFileType(Buffer.from("not-an-image"), "image/png"), false);
    assert.equal(matchesDeclaredFileType(Buffer.from("RIFF0000WEBP"), "video/mp4"), false);
  });

  it("distingue marcas de vídeo de imagens no contêiner ISO", () => {
    const mp4 = Buffer.from("0000ftypmp42", "ascii");
    const heic = Buffer.from("0000ftypheic", "ascii");
    const quickTime = Buffer.from("0000ftypqt  ", "ascii");

    assert.equal(matchesDeclaredFileType(mp4, "video/mp4"), true);
    assert.equal(matchesDeclaredFileType(heic, "video/mp4"), false);
    assert.equal(matchesDeclaredFileType(quickTime, "video/quicktime"), true);
  });

  it("exige o DocType webm além do cabeçalho EBML", () => {
    const ebml = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
    const webm = Buffer.concat([ebml, Buffer.from("metadata-webm")]);

    assert.equal(matchesDeclaredFileType(ebml, "video/webm"), false);
    assert.equal(matchesDeclaredFileType(webm, "video/webm"), true);
  });
});
