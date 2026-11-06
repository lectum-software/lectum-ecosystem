import assert from "node:assert/strict";
import { test } from "node:test";
import type { VideoQueue } from "./client.js";
import { enqueueSocialShareJob } from "./jobs.js";

test("social queue preserves captions and allows bounded transcripts larger than 4KB", async () => {
  let captured: unknown[] = [];
  const queue = {
    add: async (...args: unknown[]) => {
      captured = args;
    },
  } as unknown as VideoQueue;
  const captionCues = Array.from({ length: 100 }, (_, index) => ({
    start: index * 2,
    end: index * 2 + 1,
    text: "Texto de legenda para validar o tamanho da fila.",
  }));
  await enqueueSocialShareJob(queue, {
    jobId: "caption-queue-test",
    sourceOrigin: null,
    sourceUrl: "https://example.com/video.mp4",
    metadata: {
      overlayMode: "captions",
      captionCues,
      cardLabel: "Lectum",
      professionalName: "Teste",
      professionalRoleLabel: "Psicologo",
      professionalVerified: false,
      responseText: null,
      sourceText: "Teste",
    },
  });
  const payload = captured[1] as { metadata: { overlayMode: string; captionCues: unknown[] } };
  const options = captured[2] as { sizeLimit: number };
  assert.equal(payload.metadata.overlayMode, "captions");
  assert.deepEqual(payload.metadata.captionCues, captionCues);
  assert.ok(Buffer.byteLength(JSON.stringify(payload)) > 4096);
  assert.equal(options.sizeLimit, 4 * 1024 * 1024);
});
