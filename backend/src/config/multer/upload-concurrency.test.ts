import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UploadInfrastructureError } from "./errors";
import { createUploadConcurrencyGate } from "./upload-concurrency";

describe("upload concurrency gate", () => {
  it("mantém o teto global e libera a fila em ordem", async () => {
    const gate = createUploadConcurrencyGate(1, 2);
    await gate.acquire();

    let secondAcquired = false;
    const second = gate.acquire().then(() => {
      secondAcquired = true;
    });
    await Promise.resolve();
    assert.equal(secondAcquired, false);

    gate.release();
    await second;
    assert.equal(secondAcquired, true);
    gate.release();
  });

  it("rejeita quando a fila configurada está cheia", async () => {
    const gate = createUploadConcurrencyGate(1, 1);
    await gate.acquire();
    const queued = gate.acquire();

    await assert.rejects(gate.acquire(), UploadInfrastructureError);
    gate.release();
    await queued;
    gate.release();
  });

  it("remove espera cancelada sem perder o slot global", async () => {
    const gate = createUploadConcurrencyGate(1, 2);
    await gate.acquire();
    const canceled = new AbortController();
    const queued = gate.acquire(canceled.signal);

    canceled.abort();
    await assert.rejects(queued, { name: "AbortError" });
    gate.release();

    await gate.acquire();
    gate.release();
  });
});
