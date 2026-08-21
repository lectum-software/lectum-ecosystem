import assert from "node:assert/strict";
import test from "node:test";
import { mapWithConcurrency } from "./map-with-concurrency.ts";

test("preserva ordem e respeita o teto de concorrência", async () => {
  let active = 0;
  let maximumActive = 0;
  const result = await mapWithConcurrency([3, 1, 2, 4], 2, async (value) => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise((resolve) => setTimeout(resolve, value));
    active -= 1;
    return value * 2;
  });

  assert.deepEqual(result, [6, 2, 4, 8]);
  assert.equal(maximumActive, 2);
});

test("interrompe a fila após falha e aguarda os trabalhos já iniciados", async () => {
  const started = [];
  let inFlightFinished = false;

  await assert.rejects(
    mapWithConcurrency([0, 1, 2, 3], 2, async (value) => {
      started.push(value);
      if (value === 1) throw new Error("upload_failed");

      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlightFinished = true;
      return value;
    }),
    /upload_failed/,
  );

  assert.deepEqual(started, [0, 1]);
  assert.equal(inFlightFinished, true);
});

test("mantém o lote pendente até o último trabalho concorrente terminar", async () => {
  let releaseSlowWorker;
  let reportFastWorker;
  let batchSettled = false;
  const slowWorkerGate = new Promise((resolve) => {
    releaseSlowWorker = resolve;
  });
  const fastWorkerDone = new Promise((resolve) => {
    reportFastWorker = resolve;
  });

  const batch = mapWithConcurrency(["slow", "fast"], 2, async (item) => {
    if (item === "slow") await slowWorkerGate;
    else reportFastWorker();
    return item;
  });
  void batch.then(() => {
    batchSettled = true;
  });

  await fastWorkerDone;
  await Promise.resolve();
  assert.equal(batchSettled, false);

  releaseSlowWorker();
  assert.deepEqual(await batch, ["slow", "fast"]);
  assert.equal(batchSettled, true);
});
