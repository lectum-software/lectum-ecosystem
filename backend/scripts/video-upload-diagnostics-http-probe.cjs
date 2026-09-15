// Actual Express router, strict validator, JWT/device authentication and PostgreSQL.
// Database-only preconditions; no mock routes, substituted providers or application methods.
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { once } = require("node:events");
assert.equal(process.env.NODE_ENV, "test");
assert.match(
  new URL(process.env.DATABASE_URL).hostname,
  /^lectum-upload-diagnostics178-db-[a-f0-9]{20}$/,
);
assert.equal(new URL(process.env.DATABASE_URL).pathname, "/lectum_audit");

// Only construct the unused Passport Google strategy. OAuth is never invoked,
// and the shared runner denies external network egress and host .env configuration.
process.env.GOOGLE_CLIENT_ID_API_USER = "unused-in-upload-diagnostics-jwt-probe";
process.env.GOOGLE_CLIENT_SECRET_API_USER = "unused-in-upload-diagnostics-jwt-probe";
const express = require("/app/node_modules/express");
const { prisma } = require("/app/dist/external/prisma/client.js");
const privateAuth = require("/app/dist/modules/api/middlewares/_auth/index.js").default;
const router = require("/app/dist/modules/api/private/video-assets/index.js").default;
const {
  LoginRepository,
} = require("/app/dist/modules/api/public/auth/login/repositories/LoginRepository.js");
const stream = require("/app/dist/infra/video-stream/index.js");
const i18n = require("/app/dist/main/server/i18n.js").default;
let server;
let base;
let passed = 0;
let step = "setup";
const failures = [];
const snapshots = [];

async function check(name, run) {
  step = name;
  try {
    await run();
    passed++;
    console.log("CHECK_OK", name);
  } catch {
    failures.push(name);
    console.log("CHECK_FAIL", name);
  }
}
const next = () => randomBytes(8).toString("hex");
async function newOwner() {
  const user = await prisma.user.create({
    data: {
      name: "Isolated upload diagnostics HTTP",
      email: `upload-diagnostics-${next()}@example.test`,
      role: "psicologo",
      confirmed: true,
      active: true,
      need_reset: false,
    },
  });
  const profile = await prisma.psychologist_profile.create({ data: { user_id: user.id } });
  const device = `upload-diagnostics-${next()}`;
  const hydrated = await new LoginRepository(device).hidrate(user, device);
  return { user, profile, device, token: hydrated.user_tokens[0].token };
}
async function newAsset(owner, extra = {}) {
  const asset = await prisma.video_asset.create({
    data: {
      owner_id: owner.user.id,
      provider: "cloudflare_stream",
      provider_uid: randomBytes(16).toString("hex"),
      purpose: "profile_presentation",
      context_id: owner.profile.id,
      status: "uploading",
      mime_type: "video/mp4",
      size_bytes: 1n,
      upload_expires_at: new Date(Date.now() + 60_000),
      ...extra,
    },
  });
  snapshots.push(asset);
  return asset;
}
const readAsset = (asset) => prisma.video_asset.findUniqueOrThrow({ where: { id: asset.id } });
const readProfile = (owner) =>
  prisma.psychologist_profile.findUniqueOrThrow({ where: { id: owner.profile.id } });
const payload = {
  event: "transfer_start",
  phase: "transfer",
  method: "tus",
  reason: "none",
  httpStatus: 0,
  progress: 0,
  elapsedMs: 0,
  retryCount: 0,
  online: true,
  visibility: "visible",
  wasHidden: false,
};

async function request(id, owner, body = payload, overrides = {}, query = "") {
  const headers = {
    "Accept-Language": "pt",
    "Content-Type": "application/json",
    "x-refine": "true",
  };
  if (owner) {
    headers.authorization = `Bearer ${owner.token}`;
    headers["x-device"] = owner.device;
  }
  Object.assign(headers, overrides);
  for (const name of Object.keys(headers)) if (headers[name] === null) delete headers[name];
  const response = await fetch(`${base}/api/private/video-assets/${id}/upload-events${query}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json();
  // Never print authenticated responses, identifiers, headers, URLs or diagnostic bodies.
  for (const key of ["stack", "token", "provider_uid", "owner_id", "sql"])
    assert.equal(Object.hasOwn(result, key), false);
  return { status: response.status, body: result, headers: response.headers };
}
const expectReceived = (result) => {
  assert.equal(result.status, 200);
  assert.equal(result.body.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.code, "video_upload_event_received");
  assert.deepEqual(result.body.data, { received: true });
};
const expectInvalid = (result) => {
  assert.equal(result.status, 422);
  assert.equal(result.body.success, false);
  assert.equal(result.body.code, "invalid_structure");
  assert.equal(typeof result.body.error, "string");
  assert.deepEqual(Object.keys(result.body).sort(), ["code", "error", "status", "success"]);
};

(async () => {
  assert.equal(stream.getVideoStreamConfig(), null);
  assert.equal(stream.getVideoStreamProvider(), null);
  if (!i18n.isInitialized) await new Promise((resolve) => i18n.on("initialized", resolve));
  const app = express();
  app.use(express.json());
  app.use(require("/app/node_modules/cookie-parser")());
  app.use(require("/app/node_modules/i18next-http-middleware").handle(i18n));
  app.use("/api/private/video-assets", privateAuth, router);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
  const owner = await newOwner();
  const other = await newOwner();
  const asset = await newAsset(owner);
  const originalProfile = await readProfile(owner);

  await check("diagnostics_requires_session", async () => {
    const result = await request(asset.id);
    assert.equal(result.status, 401);
    assert.equal(result.body.code, "token_not_provided");
  });
  await check("diagnostics_requires_device", async () => {
    assert.equal((await request(asset.id, owner, payload, { "x-device": null })).status, 403);
  });
  await check("diagnostics_rejects_wrong_device", async () => {
    assert.equal(
      (await request(asset.id, owner, payload, { "x-device": other.device })).status,
      401,
    );
  });
  await check("diagnostics_accepts_real_cookie_session", async () => {
    expectReceived(
      await request(asset.id, owner, payload, {
        authorization: null,
        cookie: `lectum_user_session=${encodeURIComponent(owner.token)}`,
        "x-requested-with": "Lectum-User-Cookie-Auth",
      }),
    );
  });
  await check("diagnostics_retains_legacy_bearer_and_basic", async () => {
    expectReceived(await request(asset.id, owner, { ...payload, method: "basic" }));
  });
  await check("diagnostics_foreign_asset_is_not_found", async () => {
    const result = await request(asset.id, other);
    assert.equal(result.status, 404);
    assert.equal(result.body.code, "video_asset_not_found");
    assert.deepEqual(await readAsset(asset), asset);
  });
  await check("diagnostics_unknown_asset_is_not_found", async () => {
    const result = await request(`absent_${next()}`, owner);
    assert.equal(result.status, 404);
    assert.equal(result.body.code, "video_asset_not_found");
  });
  await check("diagnostics_deleted_asset_is_not_found", async () => {
    const deleted = await newAsset(owner, { deleted: true, deletedAt: new Date() });
    const result = await request(deleted.id, owner);
    assert.equal(result.status, 404);
    assert.equal(result.body.code, "video_asset_not_found");
    assert.deepEqual(await readAsset(deleted), deleted);
  });
  await check("diagnostics_unknown_fields_are_not_reflected", async () => {
    const canary = `forbidden-${next()}`;
    const result = await request(asset.id, owner, {
      ...payload,
      url: `https://example.test/${canary}`,
      errorBody: canary,
      purpose: "community_reply",
      uploadRef: canary,
      ownerId: other.user.id,
    });
    expectInvalid(result);
    assert.equal(JSON.stringify(result.body).includes(canary), false);
    assert.equal(JSON.stringify(result.body).includes(other.user.id), false);
  });
  await check("diagnostics_rejects_unbounded_or_coerced_numbers", async () => {
    expectInvalid(
      await request(asset.id, owner, {
        ...payload,
        httpStatus: 600,
        elapsedMs: 86_400_001,
        progress: "100",
        retryCount: -1,
      }),
    );
  });
  await check("diagnostics_rejects_free_text_and_coerced_booleans", async () => {
    expectInvalid(
      await request(asset.id, owner, {
        ...payload,
        event: "something else",
        reason: "provider error body",
        online: "true",
      }),
    );
  });
  await check("diagnostics_requires_all_fields", async () => {
    const { wasHidden: _wasHidden, ...incomplete } = payload;
    expectInvalid(await request(asset.id, owner, incomplete));
  });
  await check("diagnostics_rejects_invalid_id", async () => {
    expectInvalid(await request("a", owner));
  });
  await check("diagnostics_rejects_query_fields", async () => {
    expectInvalid(await request(asset.id, owner, payload, {}, "?extra=forbidden"));
  });
  await check("diagnostics_all_reports_leave_upload_and_association_unchanged", async () => {
    for (const [event, phase, reason] of [
      ["transfer_start", "transfer", "none"],
      ["transfer_complete", "transfer", "none"],
      ["ready", "processing", "none"],
      ["failed", "processing", "processing_timeout"],
      ["canceled", "transfer", "canceled"],
    ]) {
      expectReceived(
        await request(asset.id, owner, {
          ...payload,
          event,
          phase,
          reason,
          httpStatus: 599,
          progress: 100,
          elapsedMs: 86_400_000,
          retryCount: 100,
          online: false,
          visibility: "hidden",
          wasHidden: true,
        }),
      );
      assert.deepEqual(await readAsset(asset), asset);
      assert.deepEqual(await readProfile(owner), originalProfile);
    }
  });
  await check("diagnostics_accepts_nonuploading_states_without_transition", async () => {
    for (const status of ["processing", "ready", "error", "canceled"]) {
      const current = await newAsset(owner, {
        status,
        ready_at: status === "ready" ? new Date() : null,
      });
      expectReceived(
        await request(current.id, owner, { ...payload, event: "ready", phase: "processing" }),
      );
      assert.deepEqual(await readAsset(current), current);
      assert.deepEqual(await readProfile(owner), originalProfile);
    }
  });
  await check("diagnostics_rejects_revoked_session", async () => {
    const revoked = await newOwner();
    const current = await newAsset(revoked);
    await prisma.user_token.deleteMany({ where: { user_id: revoked.user.id } });
    assert.equal((await request(current.id, revoked)).status, 401);
    assert.deepEqual(await readAsset(current), current);
  });
  await check("diagnostics_rejects_inactive_account", async () => {
    const inactive = await newOwner();
    const current = await newAsset(inactive);
    await prisma.user.update({
      where: { id: inactive.user.id },
      data: { active: false, account_status: "suspended" },
    });
    assert.equal((await request(current.id, inactive)).status, 401);
    assert.deepEqual(await readAsset(current), current);
  });
  await check("diagnostics_limits_thirty_requests_per_minute", async () => {
    let result = await request(asset.id, owner);
    expectReceived(result);
    assert.equal(result.headers.get("RateLimit-Limit"), "30");
    const remaining = Number(result.headers.get("RateLimit-Remaining"));
    assert.ok(Number.isInteger(remaining) && remaining >= 0 && remaining < 30);
    for (let count = 0; count < remaining; count++) {
      result = await request(asset.id, owner);
      expectReceived(result);
      assert.equal(Number(result.headers.get("RateLimit-Remaining")), remaining - count - 1);
    }
    result = await request(asset.id, owner);
    assert.equal(result.status, 429);
    assert.equal(result.body.code, "too_many_requests");
    assert.equal(result.headers.get("RateLimit-Remaining"), "0");
    const retryAfter = Number(result.headers.get("Retry-After"));
    assert.ok(retryAfter > 0 && retryAfter <= 60);
    // The shared limiter is per IP, not per asset or authenticated identity.
    assert.equal((await request(asset.id, other)).status, 429);
  });
  await check("diagnostics_never_changes_any_asset_or_profile", async () => {
    for (const original of snapshots) assert.deepEqual(await readAsset(original), original);
    assert.deepEqual(await readProfile(owner), originalProfile);
  });
  console.log(
    "PROBE_SUMMARY",
    JSON.stringify({ passed, failed: failures.length, total: passed + failures.length }),
  );
  assert.equal(failures.length, 0);
  console.log("VIDEO_UPLOAD_DIAGNOSTICS_HTTP_POSTGRES_OK");
})()
  .catch(() => {
    console.log("INTEGRATION_FAILED", step);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
  });
