const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createPublicProfilePreview, alias } = require('./local-public-profiles.cjs');
const sourceId = 'publicpsychologist000001';
const ownId = 'localpsychologist0000001';
const prefix = '/api/private/directory/psychologists';
function setup(overrides = {}) {
  const requests = [];
  const options = {
    ownUserIds: [ownId], env: { NODE_ENV: 'development', PORT: '3001' },
    cors: () => true, registerMedia: () => 'http://localhost:3001/media', allowVideo: () => {},
    fetchPublic: async (url, init) => {
      requests.push({ url, init });
      const profile = { id: sourceId, name: 'Public test fixture', crp: 'fixture', specialties: [], whatsapp_url: 'https://wa.me/fixture' };
      return { ok: true, status: 200, json: async () => ({ status: 200, success: true, data: new URL(url).pathname === prefix ? { data: [profile], pages: 1 } : profile }) };
    }, ...overrides,
  };
  const handler = createPublicProfilePreview(options);
  const call = async (url, method = 'GET') => {
    const response = { writeHead(status) { this.status = status; }, end(body) { this.body = body ? JSON.parse(body) : null; } };
    const handled = await handler({ url, method, headers: { authorization: 'secret-fixture', cookie: 'session-fixture' } }, response);
    return { handled, ...response };
  };
  return { call, requests, options };
}
test('production and unconfigured owner cannot enable preview', () => {
  const { options } = setup();
  assert.throws(() => createPublicProfilePreview({ ...options, env: { NODE_ENV: 'production', PORT: '3001' } }));
  assert.throws(() => createPublicProfilePreview({ ...options, ownUserIds: [] }));
});
test('public response uses aliases and read-only capabilities without contacts', async () => {
  const { call, requests } = setup();
  const response = await call(prefix + '?search=Public&token=not-forwarded');
  assert.equal(response.status, 200);
  const profile = response.body.data.data[0];
  assert.equal(profile.id, alias(sourceId));
  assert.equal(profile.read_only, true);
  assert.equal(profile.whatsapp_url, null);
  assert.equal(requests[0].init.method, 'GET');
  assert.equal(requests[0].init.redirect, 'error');
  assert.equal(requests[0].init.headers, undefined);
  assert.equal(new URL(requests[0].url).searchParams.has('token'), false);
});
test('own profile and private editor remain entirely local for GET and PUT', async () => {
  const { call, requests } = setup();
  for (const method of ['GET', 'PUT']) {
    assert.equal((await call(prefix + '/' + ownId, method)).handled, false);
    assert.equal((await call('/api/private/psychologist/profile', method)).handled, false);
  }
  assert.equal(requests.length, 0);
});
test('direct imported alias resolves anonymously; repeat reads use cache', async () => {
  const { call, requests } = setup();
  const url = prefix + '/' + alias(sourceId);
  assert.equal((await call(url)).body.data.id, alias(sourceId));
  const count = requests.length;
  assert.equal((await call(url)).status, 200);
  assert.equal(requests.length, count);
});
test('mutations of remote profiles are refused without upstream calls', async () => {
  const { call, requests } = setup();
  await call(prefix);
  const count = requests.length;
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.equal((await call(prefix + '/' + alias(sourceId), method)).status, 403);
    assert.equal((await call('/api/private/user/favorites/' + alias(sourceId), method)).status, 403);
  }
  assert.equal(requests.length, count);
});
test('public failures are not replaced with fabricated profiles or exposed errors', async () => {
  const { call } = setup({ fetchPublic: async () => { throw Error('secret internal error'); } });
  const response = await call(prefix);
  assert.equal(response.status, 502);
  assert.equal(response.body.success, false);
  assert.ok(!JSON.stringify(response.body).includes('secret'));
});
