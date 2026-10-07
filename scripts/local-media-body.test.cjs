const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readLocalMediaBody } = require('./local-media-body.cjs');
test('public media is consumed with a bounded allocation', async () => {
  async function* data() { yield Buffer.from('first'); yield Buffer.from('second'); }
  assert.equal((await readLocalMediaBody(data())).toString(), 'firstsecond');
  await assert.rejects(readLocalMediaBody(data(), 8), /too large/);
});
test('timeout and cancellation reject inside the caller catch boundary', async () => {
  const timeout = new DOMException('Test timeout', 'TimeoutError');
  const stream = new ReadableStream({ start(controller) { setTimeout(() => controller.error(timeout), 10); } });
  await assert.rejects(readLocalMediaBody(stream), error => error === timeout);
});
