import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchesDeclaredFileType } from "./file-signature";

const fileTypeBox = (majorBrand: string, compatibleBrands: string[] = []) => {
  const size = 16 + compatibleBrands.length * 4;
  const buffer = Buffer.alloc(size);
  buffer.writeUInt32BE(size, 0);
  buffer.write("ftyp", 4, 4, "ascii");
  buffer.write(majorBrand, 8, 4, "ascii");
  buffer.writeUInt32BE(0, 12);
  compatibleBrands.forEach((brand, index) => {
    buffer.write(brand, 16 + index * 4, 4, "ascii");
  });
  return buffer;
};

const isoBox = (type: string, payloadBytes = 8) => {
  const buffer = Buffer.alloc(8 + payloadBytes);
  buffer.writeUInt32BE(buffer.length, 0);
  buffer.write(type, 4, 4, "ascii");
  return buffer;
};

const partialIsoBox = (type: string, declaredSize: number) => {
  const buffer = Buffer.alloc(16);
  buffer.writeUInt32BE(declaredSize, 0);
  buffer.write(type, 4, 4, "ascii");
  return buffer;
};

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
    const mp4 = fileTypeBox("mp42", ["isom"]);
    const heic = fileTypeBox("heic", ["mif1", "isom"]);
    const avif = fileTypeBox("avif", ["isom"]);
    const quickTime = fileTypeBox("qt  ");

    assert.equal(matchesDeclaredFileType(mp4, "video/mp4"), true);
    assert.equal(matchesDeclaredFileType(heic, "video/mp4"), false);
    assert.equal(matchesDeclaredFileType(heic, "video/quicktime"), false);
    assert.equal(matchesDeclaredFileType(avif, "video/mp4"), false);
    assert.equal(matchesDeclaredFileType(quickTime, "video/quicktime"), true);
  });

  it("considera marcas compatíveis de MOV e MP4 em vez de somente a marca principal", () => {
    const compatibleQuickTime = fileTypeBox("XAVC", ["qt  "]);
    const compatibleMp4 = fileTypeBox("XAVC", ["isom", "iso6"]);

    assert.equal(matchesDeclaredFileType(compatibleQuickTime, "video/quicktime"), true);
    assert.equal(matchesDeclaredFileType(compatibleMp4, "video/mp4"), true);
  });

  it("localiza ftyp após átomos de preenchimento permitidos", () => {
    const quickTime = Buffer.concat([isoBox("free"), fileTypeBox("qt  ")]);

    assert.equal(matchesDeclaredFileType(quickTime, "video/quicktime"), true);
  });

  it("aceita átomo de QuickTime legado mesmo quando ele ultrapassa o primeiro chunk", () => {
    const legacyQuickTime = partialIsoBox("mdat", 250 * 1024 * 1024);

    assert.equal(matchesDeclaredFileType(legacyQuickTime, "video/quicktime"), true);
    assert.equal(matchesDeclaredFileType(legacyQuickTime, "video/mp4"), false);
  });

  it("não trata um átomo genérico isolado como assinatura de QuickTime", () => {
    assert.equal(matchesDeclaredFileType(isoBox("free"), "video/quicktime"), false);
  });

  it("rejeita caixa ftyp malformada", () => {
    const malformed = fileTypeBox("qt  ");
    malformed.writeUInt32BE(malformed.length + 100, 0);

    assert.equal(matchesDeclaredFileType(malformed, "video/quicktime"), false);
  });

  it("exige o DocType webm além do cabeçalho EBML", () => {
    const ebml = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
    const webm = Buffer.concat([ebml, Buffer.from("metadata-webm")]);

    assert.equal(matchesDeclaredFileType(ebml, "video/webm"), false);
    assert.equal(matchesDeclaredFileType(webm, "video/webm"), true);
  });
});
