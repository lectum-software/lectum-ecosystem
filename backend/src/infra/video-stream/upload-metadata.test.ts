import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildUploadMetadata } from "./cloudflare-stream";
import { type ProvisionVideoUploadInput, VIDEO_ASSET_PURPOSES } from "./types";

const input: ProvisionVideoUploadInput = {
  assetId: "asset_metadata_regression",
  expiresAt: new Date("2030-01-02T03:04:05.000Z"),
  maxDurationSeconds: 600,
  purpose: "profile_presentation",
  sizeBytes: 237_103_021,
  uploadMethod: "tus",
};

const decodeMetadata = (header: string) =>
  Object.fromEntries(
    header.split(",").map((entry) => {
      const [key, value = ""] = entry.split(" ");
      return [key, Buffer.from(value, "base64").toString("utf8")];
    }),
  );

describe("Serialização real de metadados TUS", () => {
  for (const purpose of VIDEO_ASSET_PURPOSES) {
    it(`preserva dois domínios sem aspas/colchetes em ${purpose}`, () => {
      const origins = Object.freeze(["homolog.lectum.com.br", "homolog.admin.lectum.com.br"]);
      const header = buildUploadMetadata({ ...input, purpose }, origins);
      const metadata = decodeMetadata(header);

      assert.equal(metadata.allowedorigins, "homolog.lectum.com.br,homolog.admin.lectum.com.br");
      assert.deepEqual(metadata.allowedorigins.split(","), origins);
      assert.doesNotMatch(metadata.allowedorigins, /[[\]"]/);
      // A vírgula entre domínios fica dentro do Base64, não vira uma nova chave TUS.
      assert.equal(header.split(",").length, 6);
      assert.deepEqual(Object.keys(metadata), [
        "name",
        "maxDurationSeconds",
        "requiresignedurls",
        "allowedorigins",
        "thumbnailtimestamppct",
        "expiry",
      ]);
      assert.equal(metadata.name, `lectum-${purpose}-${input.assetId}`);
    });
  }

  it("mantém domínio único como texto, não array JSON", () => {
    const metadata = decodeMetadata(buildUploadMetadata(input, ["homolog.lectum.com.br"]));
    assert.equal(metadata.allowedorigins, "homolog.lectum.com.br");
  });

  it("mantém assinatura obrigatória, duração e expiração sem mudar os limites", () => {
    const header = buildUploadMetadata(input, ["homolog.lectum.com.br"]);
    const metadata = decodeMetadata(header);
    assert.ok(header.split(",").includes("requiresignedurls"));
    assert.equal(metadata.requiresignedurls, "");
    assert.equal(metadata.maxDurationSeconds, "600");
    assert.equal(metadata.expiry, input.expiresAt.toISOString());
    assert.equal(metadata.thumbnailtimestamppct, "0.1");
  });
});
