// Real repository + PostgreSQL; only disposable runner, never published DB.
const assert = require("node:assert/strict");
const { Client } = require("/app/node_modules/pg");
const { setTimeout: delay } = require("node:timers/promises");
assert.equal(process.env.NODE_ENV, "test");
assert.match(new URL(process.env.DATABASE_URL).hostname, /^lectum-duration178-db-[a-f0-9]{20}$/);
assert.equal(new URL(process.env.DATABASE_URL).pathname, "/lectum_audit");
const { prisma } = require("/app/dist/external/prisma/client.js");
const {
  PageViewTrackingRepository,
} = require("/app/dist/modules/api/public/analytics/page-view/repositories/PageViewTrackingRepository.js");
const repo = new PageViewTrackingRepository();
const monitor = new Client({ connectionString: process.env.DATABASE_URL });
let passed = 0,
  step = "setup";
const failures = [];
const check = async (name, run) => {
  step = name;
  try {
    await run();
    passed++;
    console.log("CHECK_OK", name);
  } catch (e) {
    if (e.code !== "ERR_ASSERTION") throw e;
    failures.push(name);
    console.log("CHECK_FAIL", name);
  }
};
const event = () =>
  prisma.page_view_event.create({
    data: {
      visitor_id: "duration-local-visitor",
      session_id: "duration-local-session",
      path: "/auditoria-local",
      normalized_path: "/auditoria-local",
    },
  });
const input = (row, n) => ({
  id: row.id,
  visitorId: row.visitor_id,
  sessionId: row.session_id,
  durationSeconds: n,
});
const read = (id) => prisma.page_view_event.findUniqueOrThrow({ where: { id } });
async function waitBlocked(min) {
  for (let i = 0; i < 400; i++) {
    const { rows } = await monitor.query(
      `SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE '%"page_view_events"%'`,
    );
    if (rows[0].n >= min) return;
    await delay(10);
  }
  throw new Error("BarrierNotReached");
}
async function withLock(row, run) {
  const blocker = new Client({ connectionString: process.env.DATABASE_URL });
  await blocker.connect();
  await blocker.query("BEGIN");
  try {
    await blocker.query("SELECT id FROM page_view_events WHERE id=$1 FOR UPDATE", [row.id]);
    await run(blocker);
  } finally {
    await blocker.query("ROLLBACK");
    await blocker.end();
  }
}
(async () => {
  await monitor.connect();
  const row = await event();
  await check("null_initializes_zero", async () => {
    assert.equal((await repo.updateDuration(input(row, 0))).duration_seconds, 0);
  });
  await check("increases", async () => {
    assert.equal((await repo.updateDuration(input(row, 61))).duration_seconds, 61);
  });
  await check("late_smaller_preserves_max", async () => {
    assert.equal((await repo.updateDuration(input(row, 2))).duration_seconds, 61);
  });
  await check("wrong_visitor_no_write", async () => {
    assert.equal(
      await repo.updateDuration({ ...input(row, 300), visitorId: "other-visitor" }),
      null,
    );
    assert.equal((await read(row.id)).duration_seconds, 61);
  });
  await check("wrong_session_no_write", async () => {
    assert.equal(
      await repo.updateDuration({ ...input(row, 300), sessionId: "other-session" }),
      null,
    );
    assert.equal((await read(row.id)).duration_seconds, 61);
  });
  await check("deleted_no_write", async () => {
    const r = await event();
    await prisma.page_view_event.update({ where: { id: r.id }, data: { deleted: true } });
    assert.equal(await repo.updateDuration(input(r, 90)), null);
    assert.equal((await read(r.id)).duration_seconds, null);
  });
  await check("concurrent_smaller_never_regresses", async () => {
    const r = await event();
    await withLock(r, async (blocker) => {
      const high = repo.updateDuration(input(r, 60));
      high.catch(() => {});
      await waitBlocked(1);
      const low = repo.updateDuration(input(r, 10));
      low.catch(() => {});
      await waitBlocked(2);
      await blocker.query("COMMIT");
      await Promise.all([high, low]);
    });
    assert.equal((await read(r.id)).duration_seconds, 60);
  });
  await check("deletion_during_duration_no_write", async () => {
    const r = await event();
    let result;
    await withLock(r, async (blocker) => {
      const update = repo.updateDuration(input(r, 60));
      update.catch(() => {});
      await waitBlocked(1);
      await blocker.query("UPDATE page_view_events SET deleted=true WHERE id=$1", [r.id]);
      await blocker.query("COMMIT");
      result = await update;
    });
    assert.equal(result, null);
    assert.equal((await read(r.id)).duration_seconds, null);
  });
  console.log(
    "PROBE_SUMMARY",
    JSON.stringify({ passed, failed: failures.length, total: passed + failures.length }),
  );
  if (failures.length) process.exitCode = 1;
  else console.log("DURATION_POSTGRES_OK");
})()
  .catch(() => {
    console.log("INTEGRATION_FAILED", step);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await monitor.end();
  });
