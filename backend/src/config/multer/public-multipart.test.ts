import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getPublicMultipartExpectedPartSize,
  getPublicMultipartPartCount,
  PUBLIC_MULTIPART_CHUNK_BYTES,
} from "./public-multipart";

describe("public multipart sizing", () => {
  it("divide 250 MiB em 50 partes de 5 MiB", () => {
    const size = 250 * 1024 * 1024;

    assert.equal(getPublicMultipartPartCount(size), 50);
    assert.equal(getPublicMultipartExpectedPartSize(size, 1), PUBLIC_MULTIPART_CHUNK_BYTES);
    assert.equal(getPublicMultipartExpectedPartSize(size, 50), PUBLIC_MULTIPART_CHUNK_BYTES);
  });

  it("calcula a parte final sem aceitar numero fora da sessao", () => {
    const finalBytes = 731;
    const size = PUBLIC_MULTIPART_CHUNK_BYTES * 2 + finalBytes;

    assert.equal(getPublicMultipartPartCount(size), 3);
    assert.equal(getPublicMultipartExpectedPartSize(size, 3), finalBytes);
    assert.equal(getPublicMultipartExpectedPartSize(size, 4), null);
  });

  it("rejeita tamanhos vazios ou invalidos", () => {
    assert.equal(getPublicMultipartPartCount(0), 0);
    assert.equal(getPublicMultipartPartCount(Number.NaN), 0);
    assert.equal(getPublicMultipartExpectedPartSize(0, 1), null);
  });
});
