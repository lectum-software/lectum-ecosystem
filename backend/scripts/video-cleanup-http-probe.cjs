// Actual Express router, validator, JWT/device authentication and PostgreSQL. No fake endpoint,
// substituted provider or application method. Ready assets are database-only preconditions.
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { once } = require("node:events");
assert.equal(process.env.NODE_ENV, "test");
assert.match(new URL(process.env.DATABASE_URL).hostname, /^lectum-media-http178-db-[a-f0-9]{20}$/);
assert.equal(new URL(process.env.DATABASE_URL).pathname, "/lectum_audit");

// Passport constructs its unused Google strategy at import time. These local placeholders only
// permit construction; OAuth is never invoked and the runner network has no external egress.
process.env.GOOGLE_CLIENT_ID_API_USER = "unused-in-media-jwt-audit";
process.env.GOOGLE_CLIENT_SECRET_API_USER = "unused-in-media-jwt-audit";
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
async function newOwner(role = "psicologo") {
  const user = await prisma.user.create({
    data: {
      name: "Isolated media HTTP audit",
      email: `media-http-${next()}@example.test`,
      role,
      confirmed: true,
      active: true,
      need_reset: false,
    },
  });
  const profile =
    role === "psicologo"
      ? await prisma.psychologist_profile.create({ data: { user_id: user.id } })
      : null;
  const device = `media-http-${next()}`;
  const hydrated = await new LoginRepository(device).hidrate(user, device);
  return { user, profile, device, token: hydrated.user_tokens[0].token };
}
const newAsset = (owner, extra = {}) =>
  prisma.video_asset.create({
    data: {
      owner_id: owner.user.id,
      provider: "cloudflare_stream",
      provider_uid: randomBytes(16).toString("hex"),
      purpose: "profile_presentation",
      context_id: owner.profile.id,
      status: "ready",
      mime_type: "video/mp4",
      size_bytes: 1n,
      upload_expires_at: new Date(Date.now() + 60_000),
      ready_at: new Date(),
      ...extra,
    },
  });
const readAsset = (asset) => prisma.video_asset.findUniqueOrThrow({ where: { id: asset.id } });
const readProfile = (owner) =>
  prisma.psychologist_profile.findUniqueOrThrow({ where: { id: owner.profile.id } });
const reference = (asset) => stream.videoAssetPlaybackReference(asset.id);
async function attachProfile(owner, asset) {
  await prisma.psychologist_profile.update({
    where: { id: owner.profile.id },
    data: { video_url: reference(asset) },
  });
}
async function request(suffix, owner, overrides = {}) {
  const headers = { "Accept-Language": "pt", "x-refine": "true" };
  if (owner) {
    headers.authorization = `Bearer ${owner.token}`;
    headers["x-device"] = owner.device;
  }
  Object.assign(headers, overrides);
  for (const name of Object.keys(headers)) if (headers[name] === null) delete headers[name];
  const response = await fetch(`${base}/api/private/video-assets/${suffix}`, {
    method: "DELETE",
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json();
  // Inspect without printing any authenticated data or request headers.
  for (const key of ["stack", "token", "provider_uid", "owner_id", "sql"])
    assert.equal(Object.hasOwn(body, key), false);
  return { status: response.status, body };
}

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
  const patient = await newOwner("paciente");
  const community = await prisma.community.create({
    data: { name: "Isolated media HTTP", slug: `http-${next()}` },
  });

  await check("cleanup_requires_session", async () => {
    const result = await request("uploads/asset_12345678");
    assert.equal(result.status, 401);
    assert.equal(result.body.code, "token_not_provided");
  });
  await check("cleanup_requires_device", async () => {
    assert.equal(
      (await request("uploads/asset_12345678", owner, { "x-device": null })).status,
      403,
    );
  });
  await check("cleanup_rejects_wrong_device", async () => {
    assert.equal(
      (await request("uploads/asset_12345678", owner, { "x-device": other.device })).status,
      401,
    );
  });
  await check("cleanup_validates_id_before_write", async () => {
    assert.equal((await request("uploads/a", owner)).status, 400);
  });
  await check("cleanup_missing_is_idempotent", async () => {
    const result = await request("uploads/asset_12345678", owner);
    assert.equal(result.status, 200);
    assert.equal(result.body.data.canceled, true);
  });
  await check("cleanup_other_owner_cannot_delete", async () => {
    const asset = await newAsset(owner);
    assert.equal((await request(`uploads/${asset.id}`, other)).status, 200);
    assert.equal((await readAsset(asset)).deleted, false);
  });
  await check("patient_cannot_delete_psychologist_asset", async () => {
    const asset = await newAsset(owner);
    assert.equal((await request(`uploads/${asset.id}`, patient)).status, 200);
    assert.equal((await readAsset(asset)).deleted, false);
  });
  await check("cleanup_detached_and_repeated", async () => {
    const asset = await newAsset(owner);
    assert.equal((await request(`uploads/${asset.id}`, owner)).status, 200);
    assert.equal((await readAsset(asset)).status, "canceled");
    assert.equal((await readAsset(asset)).deleted, true);
    assert.equal((await request(`uploads/${asset.id}`, owner)).status, 200);
  });
  await check("cleanup_retains_attached_profile", async () => {
    const asset = await newAsset(owner);
    await attachProfile(owner, asset);
    const result = await request(`uploads/${asset.id}`, owner);
    assert.equal(result.status, 409);
    assert.equal(result.body.code, "video_asset_attached");
    assert.equal((await readProfile(owner)).video_url, reference(asset));
    assert.equal((await readAsset(asset)).deleted, false);
  });
  await check("legacy_deliberate_profile_removal_preserved", async () => {
    const asset = await newAsset(owner);
    await attachProfile(owner, asset);
    assert.equal((await request(asset.id, owner)).status, 200);
    assert.equal((await readProfile(owner)).video_url, null);
    assert.equal((await readAsset(asset)).deleted, true);
  });
  await check("cleanup_and_legacy_retain_attached_post", async () => {
    const asset = await newAsset(owner, { purpose: "community_post", context_id: community.slug });
    await prisma.community_post.create({
      data: {
        author_id: owner.user.id,
        community_id: community.id,
        title: "HTTP audit",
        content: "Temporary audit",
        status: "publicado",
        media_type: "video",
        media_url: reference(asset),
      },
    });
    for (const suffix of [`uploads/${asset.id}`, asset.id])
      assert.equal((await request(suffix, owner)).status, 409);
    assert.equal((await readAsset(asset)).deleted, false);
  });
  await check("cleanup_retains_post_media_items", async () => {
    const asset = await newAsset(owner, { purpose: "community_post", context_id: community.slug });
    await prisma.community_post.create({
      data: {
        author_id: owner.user.id,
        community_id: community.id,
        title: "HTTP audit carousel",
        content: "Temporary audit",
        status: "publicado",
        media_items: {
          create: [{ media_type: "video", media_url: reference(asset), position: 0 }],
        },
      },
    });
    assert.equal((await request(`uploads/${asset.id}`, owner)).status, 409);
    assert.equal((await readAsset(asset)).deleted, false);
  });
  await check("cleanup_retains_attached_reply", async () => {
    const post = await prisma.community_post.create({
      data: {
        author_id: owner.user.id,
        community_id: community.id,
        title: "HTTP audit reply",
        content: "Temporary audit",
        status: "publicado",
      },
    });
    const asset = await newAsset(owner, { purpose: "community_reply", context_id: post.id });
    await prisma.post_reply.create({
      data: {
        author_id: owner.user.id,
        post_id: post.id,
        content: "Temporary audit",
        media_type: "video",
        media_url: reference(asset),
      },
    });
    assert.equal((await request(`uploads/${asset.id}`, owner)).status, 409);
    assert.equal((await readAsset(asset)).deleted, false);
  });
  await check("cleanup_accepts_real_cookie_session", async () => {
    const asset = await newAsset(owner);
    const result = await request(`uploads/${asset.id}`, owner, {
      authorization: null,
      cookie: `lectum_user_session=${encodeURIComponent(owner.token)}`,
      "x-requested-with": "Lectum-User-Cookie-Auth",
    });
    assert.equal(result.status, 200);
    assert.equal((await readAsset(asset)).deleted, true);
  });
  await check("cleanup_rejects_revoked_session", async () => {
    const revoked = await newOwner();
    const asset = await newAsset(revoked);
    await prisma.user_token.deleteMany({ where: { user_id: revoked.user.id } });
    assert.equal((await request(`uploads/${asset.id}`, revoked)).status, 401);
    assert.equal((await readAsset(asset)).deleted, false);
  });
  await check("cleanup_rejects_inactive_account", async () => {
    const inactive = await newOwner();
    const asset = await newAsset(inactive);
    await prisma.user.update({
      where: { id: inactive.user.id },
      data: { active: false, account_status: "suspended" },
    });
    assert.equal((await request(`uploads/${asset.id}`, inactive)).status, 401);
    assert.equal((await readAsset(asset)).deleted, false);
  });
  console.log(
    "PROBE_SUMMARY",
    JSON.stringify({ passed, failed: failures.length, total: passed + failures.length }),
  );
  assert.equal(failures.length, 0);
  console.log("VIDEO_CLEANUP_HTTP_POSTGRES_OK");
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
