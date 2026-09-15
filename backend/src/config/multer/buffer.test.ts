import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { describe, it } from "node:test";
import { streamToBuffer } from "./buffer";

describe("streamToBuffer", () => {
  it("concatena o stream e remove os listeners proprios", async () => {
    const stream = new PassThrough();
    const buffered = streamToBuffer(stream);

    stream.end(Buffer.from("lectum"));

    assert.equal((await buffered).toString("utf8"), "lectum");
    assert.equal(stream.listenerCount("data"), 0);
    assert.equal(stream.listenerCount("end"), 0);
  });

  it("falha imediatamente para stream destruido", async () => {
    const stream = new PassThrough();
    stream.destroy();

    await assert.rejects(streamToBuffer(stream), { name: "AbortError" });
  });

  it("interrompe a espera quando o sinal e cancelado", async () => {
    const stream = new PassThrough();
    const controller = new AbortController();
    const buffered = streamToBuffer(stream, controller.signal);

    controller.abort();

    await assert.rejects(buffered, { name: "AbortError" });
    assert.equal(stream.listenerCount("data"), 0);
    assert.equal(stream.listenerCount("end"), 0);
  });
});
