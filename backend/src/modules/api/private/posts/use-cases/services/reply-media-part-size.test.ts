import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isReplyMediaPartSizeValid } from "./reply-media-part-size";

const chunkSize = 5 * 1024 * 1024;
describe("reply multipart declared byte limit", () => {
  it("recusa parte única maior ou menor do que o total autorizado", () => {
    const session = { chunkSize, size: 128 };
    assert.equal(isReplyMediaPartSizeValid(session, 1, 128), true);
    assert.equal(isReplyMediaPartSizeValid(session, 1, 129), false);
    assert.equal(isReplyMediaPartSizeValid(session, 1, chunkSize), false);
    assert.equal(isReplyMediaPartSizeValid(session, 1, 127), false);
  });
  it("exige o tamanho exato da última parte e recusa partes extras", () => {
    const session = { chunkSize, size: chunkSize * 2 + 128 };
    assert.equal(isReplyMediaPartSizeValid(session, 1, chunkSize), true);
    assert.equal(isReplyMediaPartSizeValid(session, 2, chunkSize), true);
    assert.equal(isReplyMediaPartSizeValid(session, 3, 128), true);
    assert.equal(isReplyMediaPartSizeValid(session, 3, 129), false);
    assert.equal(isReplyMediaPartSizeValid(session, 3, chunkSize), false);
    assert.equal(isReplyMediaPartSizeValid(session, 4, 128), false);
    for (const part of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.equal(isReplyMediaPartSizeValid(session, part, chunkSize), false);
    }
  });
  it("preserva múltiplos exatos e recusa sessão com dimensões inválidas", () => {
    assert.equal(isReplyMediaPartSizeValid({ chunkSize, size: chunkSize * 2 }, 2, chunkSize), true);
    for (const invalid of [0, -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.equal(isReplyMediaPartSizeValid({ chunkSize, size: invalid }, 1, 128), false);
      assert.equal(isReplyMediaPartSizeValid({ chunkSize: invalid, size: 128 }, 1, 128), false);
    }
  });
});
