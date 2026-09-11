// Runs only inside the disposable database/image harness; no gateway or published data.
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { once } = require("node:events");
assert.equal(process.env.NODE_ENV, "test");
assert.match(new URL(process.env.DATABASE_URL).hostname, /^lectum-audit178-db-[a-f0-9]{20}$/);
const express = require("/app/node_modules/express");
const { prisma } = require("/app/dist/external/prisma/client.js");
const { encrypt } = require("/app/dist/utils/crypt/index.js");
const endpoint = require("/app/dist/main/server/imports/write.js").default;
const i18n = require("/app/dist/main/server/i18n.js").default;
let server,
  step = "setup",
  token;
const failed = [];
(async () => {
  if (!i18n.isInitialized) await new Promise((resolve) => i18n.on("initialized", resolve));
  const app = express();
  app.use(express.json());
  app.use(require("/app/node_modules/i18next-http-middleware").handle(i18n));
  app.use(endpoint);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const device = "discardable-community-reports";
  const request = async (path, body) => {
    const r = await fetch(`${base}${path}`, {
      method: body ? "POST" : "GET",
      signal: AbortSignal.timeout(15000),
      headers: {
        "content-type": "application/json",
        "x-refine": "true",
        "x-device": device,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, body: await r.json() };
  };
  const password = randomBytes(24).toString("hex");
  const admin = await prisma.admin.create({
    data: {
      name: "Disposable Reports Admin",
      email: "reports-admin@example.com",
      password: await encrypt(password),
      active: true,
      confirmed: true,
    },
  });
  step = "login";
  const login = await request("/api/admin/public/auth/login", { email: admin.email, password });
  assert.equal(login.status, 200);
  token = login.body.data.admin_tokens[0].token;
  step = "fixture_author";
  const author = await prisma.user.create({
    data: {
      name: "Discardable Author",
      email: "reports-author@example.com",
      role: "paciente",
      confirmed: true,
    },
  });
  step = "fixture_reporter";
  const reporter = await prisma.user.create({
    data: {
      name: "Discardable Reporter",
      email: "reports-reporter@example.com",
      role: "paciente",
      confirmed: true,
    },
  });
  step = "fixture_community";
  const community = await prisma.community.create({
    data: { name: "Discardable Reports", slug: "auditoria-lectum-178", active: true },
  });
  step = "fixture_post";
  const post = await prisma.community_post.create({
    data: {
      community_id: community.id,
      author_id: author.id,
      title: "Disposable report target",
      content: "Discardable content for a database contract regression",
      status: "published",
    },
  });
  step = "fixture_report";
  const report = await prisma.post_report.create({
    data: {
      post_id: post.id,
      target_id: post.id,
      target_type: "post",
      reporter_id: reporter.id,
      reason: "spam",
      status: "pendente",
    },
  });
  const route = `/api/admin/private/communities/${community.slug}/reports`;
  const check = async (name, fn) => {
    step = name;
    try {
      await fn();
      console.log("CHECK_OK", name);
    } catch (e) {
      failed.push(name);
      console.log(
        "INTEGRATION_FAILED",
        name,
        "actual",
        typeof e.actual === "number" ? e.actual : "unavailable",
      );
    }
  };
  await check("omitted_dates_returns_persisted_report", async () => {
    const r = await request(`${route}?page=1&limit=10&status=all&type=all`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.cards.find((x) => x.id === "total").value, 1);
    assert.equal(r.body.data.data[0].reporters[0].id, report.id);
  });
  await check("legacy_empty_dates_should_return_persisted_report", async () => {
    const r = await request(`${route}?from=&to=&page=1&limit=10&status=all&type=all`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.count, 1);
  });
  await check("offered_psychologist_type_filters_should_be_accepted", async () => {
    for (const type of [
      "verified_psychologist_post",
      "unverified_psychologist_post",
      "verified_psychologist_reply",
      "unverified_psychologist_reply",
    ]) {
      const r = await request(`${route}?page=1&limit=10&status=all&type=${type}`);
      assert.equal(r.status, 200);
      assert.equal(r.body.data.count, 0);
    }
  });
  await check("partial_range_remains_invalid", async () => {
    assert.equal((await request(`${route}?from=2026-09-01`)).status, 400);
  });
  await check("inverted_range_remains_invalid", async () => {
    assert.equal((await request(`${route}?from=2026-09-11&to=2026-09-01`)).status, 400);
  });
  await check("malformed_range_remains_invalid", async () => {
    assert.equal((await request(`${route}?from=not-a-date&to=2026-09-11`)).status, 400);
  });
  await check("type_and_pagination_limits_remain_enforced", async () => {
    assert.equal((await request(`${route}?type=${"x".repeat(33)}`)).status, 400);
    assert.equal((await request(`${route}?limit=51`)).status, 400);
    assert.equal((await request(`${route}?page=0`)).status, 400);
  });
  await check("patient_type_returns_only_the_persisted_target", async () => {
    const r = await request(`${route}?type=patient_post&status=pending`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.count, 1);
    assert.equal(r.body.data.data[0].content.id, post.id);
  });
  await check("dismissed_filter_reads_persisted_resolution", async () => {
    // Local fixture transition only: this does not claim to test the resolution endpoint.
    await prisma.post_report.update({ where: { id: report.id }, data: { status: "improcedente" } });
    const r = await request(`${route}?status=dismissed`);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.count, 1);
    assert.equal(r.body.data.cards.find((x) => x.id === "dismissed").value, 1);
    assert.equal(r.body.data.data[0].status_group, "dismissed");
    assert.equal(r.body.data.data[0].reporters[0].id, report.id);
    const pending = await request(`${route}?status=pending`);
    assert.equal(pending.status, 200);
    assert.equal(pending.body.data.count, 0);
  });
  await check("unauthenticated_read_remains_denied", async () => {
    const saved = token;
    token = undefined;
    try {
      assert.equal((await request(route)).status, 401);
    } finally {
      token = saved;
    }
  });
  step = "aggregate";
  assert.equal(failed.length, 0);
  console.log("COMMUNITY_REPORTS_POSTGRES_HTTP_OK");
})()
  .catch((e) => {
    console.error(
      "INTEGRATION_FAILED",
      step,
      e.constructor.name,
      String(e.message).match(/(?:Unknown argument `\w+`|Argument `\w+` is missing)/)?.[0] ||
        "scenario_failed",
      typeof e.code === "string" && /^P\d{4}$/.test(e.code) ? e.code : "",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
    }
    await prisma.$disconnect();
  });
