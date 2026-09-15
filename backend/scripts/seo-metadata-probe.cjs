// Real image repositories/services only. PostgreSQL triggers/locks observe and order operations;
// they never replace application methods, responses, projections or persistence primitives.
const assert = require("node:assert/strict");
const { setTimeout: delay } = require("node:timers/promises");
const { Client } = require("/app/node_modules/pg");

assert.equal(process.env.NODE_ENV, "test");
assert.match(new URL(process.env.DATABASE_URL).hostname, /^lectum-seo178-db-[a-f0-9]{20}$/);
assert.equal(new URL(process.env.DATABASE_URL).pathname, "/lectum_audit");

const { prisma } = require("/app/dist/external/prisma/client.js");
const {
  SeoMetadataRepository,
} = require("/app/dist/modules/seo/repositories/SeoMetadataRepository.js");
const { SEO_METADATA_DEFAULTS: defaults } = require("/app/dist/modules/seo/metadata-settings.js");
const publicService = require("/app/dist/modules/api/public/seo/metadata/use-cases/services.js");
const adminService = require("/app/dist/modules/api/admin/private/settings/seo/use-cases/services.js");

const repo = new SeoMetadataRepository();
const monitor = new Client({ connectionString: process.env.DATABASE_URL });
const fixtureIds = [...defaults.map((setting) => setting.id), "seo-existing-home", "seo-extra"];
const legacyRoutes = {
  community: "/community",
  community_detail: "/community/[slug]",
  community_post: "/community/[slug]/post/[id]",
  community_post_reply: "/community/[slug]/post/[id]/thread/[replyId]",
  psychologist_profile: "/psychologists/[id]",
  psychologists: "/psychologists",
  top_mentors: "/community/top-mentors",
};
let passed = 0;
let step = "setup";
let admin;
const failures = [];

// Each case owns cleanup in finally. A red baseline must still run subsequent controls.
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

const read = (page_key) => prisma.site_seo_setting.findUnique({ where: { page_key } });
const rows = () => prisma.site_seo_setting.findMany({ orderBy: { page_key: "asc" } });
const updateRow = (page_key, data) => prisma.site_seo_setting.update({ where: { page_key }, data });
const writeCount = async () =>
  Number((await monitor.query("SELECT count(*) AS n FROM seo_probe_writes")).rows[0].n);

async function emptySettings() {
  // Only this suite's explicit fixture IDs, in the guarded disposable database above.
  await prisma.site_seo_setting.deleteMany({ where: { id: { in: fixtureIds } } });
  assert.equal(await prisma.site_seo_setting.count(), 0);
}

async function initializedSettings() {
  await emptySettings();
  await repo.ensureDefaults();
}

async function legacySettings() {
  await initializedSettings();
  for (const setting of defaults) {
    const legacy = legacyRoutes[setting.page_key];
    if (!legacy) continue;
    await updateRow(setting.page_key, {
      route_path: legacy,
      ...(setting.canonical_url ? { canonical_url: legacy } : {}),
    });
  }
}

async function publicData() {
  const result = await publicService.index();
  assert.equal(result.status, 200);
  return result.data;
}

// PostgreSQL rejects every attempted INSERT/UPDATE/DELETE, even writes later rolled back.
// Unlike an INSERT barrier this also works when the corrected public read issues no write.
async function withoutWrites(run) {
  await monitor.query(
    "CREATE TRIGGER seo_probe_deny BEFORE INSERT OR UPDATE OR DELETE ON site_seo_settings FOR EACH STATEMENT EXECUTE FUNCTION seo_probe_deny_write()",
  );
  try {
    return await run();
  } finally {
    await monitor.query("DROP TRIGGER seo_probe_deny ON site_seo_settings");
  }
}

async function waitBlocked(kind, minimum) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const result = await monitor.query(
      `SELECT count(*)::int AS n FROM pg_stat_activity
       WHERE datname=current_database() AND pid<>pg_backend_pid()
       AND wait_event_type='Lock' AND query LIKE '%"site_seo_settings"%' AND query LIKE $1`,
      [`${kind}%`],
    );
    if (result.rows[0].n >= minimum) return;
    await delay(10);
  }
  throw new Error("SeoProbeBarrierNotReached");
}

async function withRowLock(pageKey, run) {
  const blocker = new Client({ connectionString: process.env.DATABASE_URL });
  const pending = [];
  const track = (promise) => {
    promise.catch(() => {});
    pending.push(promise);
    return promise;
  };
  await blocker.connect();
  try {
    await blocker.query("BEGIN");
    await blocker.query("SELECT id FROM site_seo_settings WHERE page_key=$1 FOR UPDATE", [pageKey]);
    await run(blocker, track);
  } finally {
    await blocker.query("ROLLBACK");
    await Promise.allSettled(pending);
    await blocker.end();
  }
}

async function concurrentAdminInitialization() {
  const gate = new Client({ connectionString: process.env.DATABASE_URL });
  const pending = [];
  await gate.connect();
  await monitor.query(
    "CREATE TRIGGER seo_probe_gate BEFORE INSERT ON site_seo_settings FOR EACH ROW EXECUTE FUNCTION seo_probe_insert_gate()",
  );
  try {
    await gate.query("SELECT pg_advisory_lock(178, 141)");
    for (const minimum of [1, 2]) {
      const call = adminService.index();
      call.catch(() => {});
      pending.push(call);
      await waitBlocked("INSERT", minimum);
    }
    await gate.query("SELECT pg_advisory_unlock(178, 141)");
    return await Promise.allSettled(pending);
  } finally {
    await gate.query("SELECT pg_advisory_unlock_all()");
    await Promise.allSettled(pending);
    await gate.end();
    await monitor.query("DROP TRIGGER seo_probe_gate ON site_seo_settings");
  }
}

const adminInput = (page_key = "home") => ({
  admin,
  p: { page_key },
  b: {
    title: "Controle de metadados",
    description: "Descrição de controle da auditoria isolada",
    keywords: "controle, seo",
    canonical_url: "/controle-seo",
    og_image_url: "/logo-light.png",
    robots_index: false,
    robots_follow: true,
  },
});

function assertEditorialAndIdentity(dto, stored) {
  for (const key of [
    "id",
    "title",
    "description",
    "keywords",
    "og_title",
    "og_description",
    "og_image_url",
    "robots_index",
    "robots_follow",
  ]) {
    assert.deepEqual(dto[key], stored[key]);
  }
  assert.deepEqual(dto.created_at, stored.createdAt);
  assert.deepEqual(dto.updated_at, stored.updatedAt);
  assert.equal(Object.hasOwn(dto, "updated_by_admin_id"), false);
  assert.equal(Object.hasOwn(dto, "deleted"), false);
}

(async () => {
  await monitor.connect();
  assert.equal(await prisma.site_seo_setting.count(), 0);
  admin = await prisma.admin.create({
    data: { name: "Auditoria SEO efêmera", email: "seo-probe@example.invalid" },
  });
  await monitor.query(`
    CREATE TABLE seo_probe_writes(operation text NOT NULL);
    CREATE FUNCTION seo_probe_observe() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN INSERT INTO seo_probe_writes VALUES(TG_OP); RETURN NEW; END $$;
    CREATE TRIGGER seo_probe_observe AFTER INSERT OR UPDATE ON site_seo_settings
      FOR EACH ROW EXECUTE FUNCTION seo_probe_observe();
    CREATE FUNCTION seo_probe_deny_write() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION USING ERRCODE='25006', MESSAGE='SeoProbeWriteDenied'; END $$;
    CREATE FUNCTION seo_probe_insert_gate() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.page_key='default' THEN PERFORM pg_advisory_xact_lock(178, 141); END IF;
        RETURN NEW;
      END $$;
  `);

  await check("public_empty_reads_do_not_initialize", async () => {
    await emptySettings();
    await withoutWrites(async () => {
      const results = await Promise.allSettled([publicData(), publicData(), repo.list()]);
      for (const result of results) {
        assert.equal(result.status, "fulfilled");
        assert.deepEqual(result.value, { settings: [], updated_at: null });
      }
    });
    assert.equal(await prisma.site_seo_setting.count(), 0);
  });

  await check("findByKey_empty_is_read_only", async () => {
    await emptySettings();
    await withoutWrites(async () => assert.equal(await repo.findByKey("home"), null));
    assert.equal(await prisma.site_seo_setting.count(), 0);
  });

  await check("admin_initialization_two_real_insert_barriers", async () => {
    await emptySettings();
    const results = await concurrentAdminInitialization();
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 2);
    assert.equal(await prisma.site_seo_setting.count(), defaults.length);
    for (const result of results) {
      assert.equal(result.value.status, 200);
      assert.deepEqual(
        result.value.data.settings.map((setting) => setting.id),
        defaults.map((d) => d.id),
      );
    }
  });

  await check("repeated_admin_initialization_preserves_timestamps", async () => {
    await initializedSettings();
    const before = await rows();
    const count = await writeCount();
    await repo.ensureDefaults();
    await adminService.index();
    await repo.ensureDefaults();
    assert.deepEqual(await rows(), before);
    assert.equal(await writeCount(), count);
  });

  await check("public_projects_legacy_aliases_without_writes_or_invented_dates", async () => {
    await legacySettings();
    const before = await rows();
    const dto = await withoutWrites(publicData);
    for (const setting of defaults) {
      const item = dto.settings.find((item) => item.page_key === setting.page_key);
      const stored = before.find((row) => row.page_key === setting.page_key);
      assert.equal(item.route_path, setting.route_path);
      assert.equal(item.canonical_url, setting.canonical_url);
      assertEditorialAndIdentity(item, stored);
    }
    assert.equal(
      dto.updated_at.getTime(),
      Math.max(...before.map((row) => row.updatedAt.getTime())),
    );
    assert.deepEqual(await rows(), before);
  });

  await check("canonical_custom_null_empty_and_nonexact_aliases_preserved", async () => {
    await initializedSettings();
    for (const canonical_url of [
      null,
      "",
      "/custom",
      "/community/",
      "/Community",
      "/community?q=1",
      "https://example.invalid/community",
    ]) {
      await updateRow("community", { canonical_url, route_path: "/community" });
      const before = await rows();
      const dto = await withoutWrites(publicData);
      assert.equal(
        dto.settings.find((item) => item.page_key === "community").canonical_url,
        canonical_url,
      );
      assert.deepEqual(await rows(), before);
    }
  });

  await check("existing_alternative_ids_editorial_and_unknown_keys_preserved", async () => {
    await initializedSettings();
    await updateRow("home", {
      id: "seo-existing-home",
      title: "Editorial de controle",
      canonical_url: "/custom-home",
      robots_index: false,
      keywords: ["controle"],
    });
    const extra = await prisma.site_seo_setting.create({
      data: {
        id: "seo-extra",
        page_key: "seo-extra",
        label: "ZZ Controle",
        title: "Controle extra",
        description: "Descrição extra",
        route_path: "/custom-extra",
        canonical_url: "/community",
      },
    });
    const before = await rows();
    await repo.ensureDefaults();
    const dto = await withoutWrites(publicData);
    const home = dto.settings.find((item) => item.page_key === "home");
    assert.equal(home.id, "seo-existing-home");
    assert.equal(home.canonical_url, "/custom-home");
    assertEditorialAndIdentity(
      home,
      before.find((row) => row.page_key === "home"),
    );
    const custom = dto.settings.find((item) => item.id === extra.id);
    // Existing DTO maps an unknown key to "default". A04 must not silently change that contract.
    assert.equal(custom.page_key, "default");
    assert.equal(custom.canonical_url, extra.canonical_url);
    assert.equal(custom.route_path, extra.route_path);
    assert.deepEqual(await rows(), before);
  });

  await check("preexisting_tombstone_counts_as_initialized_and_is_not_projected", async () => {
    await initializedSettings();
    await updateRow("top_mentors", {
      deleted: true,
      deletedAt: new Date(),
      route_path: "/community/top-mentors",
      canonical_url: "/community/top-mentors",
    });
    const dead = await read("top_mentors");
    await repo.ensureDefaults();
    const dto = await withoutWrites(publicData);
    assert.equal(
      dto.settings.some((item) => item.page_key === "top_mentors"),
      false,
    );
    assert.equal(await repo.findByKey("top_mentors"), null);
    assert.deepEqual(await read("top_mentors"), dead);
    assert.equal(await prisma.site_seo_setting.count(), defaults.length);
  });

  await check("missing_read_does_not_repopulate_but_admin_index_does", async () => {
    await initializedSettings();
    await prisma.site_seo_setting.delete({ where: { page_key: "community_post_reply" } });
    await withoutWrites(async () => {
      assert.equal(
        (await publicData()).settings.some((item) => item.page_key === "community_post_reply"),
        false,
      );
      assert.equal(await repo.findByKey("community_post_reply"), null);
    });
    assert.equal(await prisma.site_seo_setting.count(), defaults.length - 1);
    assert.equal((await adminService.index()).status, 200);
    assert.equal((await read("community_post_reply")).id, "site-seo-community-post-reply");
  });

  await check("admin_update_initializes_without_prior_index", async () => {
    await emptySettings();
    const input = adminInput();
    assert.equal((await adminService.update(input)).status, 200);
    const row = await read("home");
    assert.equal(row.title, input.b.title);
    assert.equal(row.updated_by_admin_id, admin.id);
    assert.equal(await prisma.site_seo_setting.count(), defaults.length);
  });

  await check("admin_upload_authorization_initializes_without_provider", async () => {
    await emptySettings();
    assert.equal(
      (await adminService.authorizeUploadImage({ admin, p: { page_key: "home" } })).status,
      200,
    );
    assert.equal(await prisma.site_seo_setting.count(), defaults.length);
    await updateRow("home", { deleted: true, deletedAt: new Date() });
    const dead = await read("home");
    assert.equal(
      (await adminService.authorizeUploadImage({ admin, p: { page_key: "home" } })).status,
      404,
    );
    assert.equal(
      (await adminService.authorizeUploadImage({ admin, p: { page_key: "not-managed" } })).status,
      422,
    );
    assert.deepEqual(await read("home"), dead);
  });

  await check("admin_update_audit_noop_and_existing_id", async () => {
    await initializedSettings();
    await updateRow("home", { id: "seo-existing-home" });
    const count = await prisma.admin_activity_log.count();
    const input = adminInput();
    const result = await adminService.update(input);
    assert.equal(result.status, 200);
    assert.equal(
      result.data.settings.find((item) => item.page_key === "home").id,
      "seo-existing-home",
    );
    assert.equal(await prisma.admin_activity_log.count(), count + 1);
    const log = await prisma.admin_activity_log.findFirst({
      where: { target_id: "seo-existing-home" },
    });
    assert.equal(log.admin_id, admin.id);
    assert.equal(log.action, "seo_metadata_updated");
    assert.equal(log.safe_after.canonical_url, input.b.canonical_url);
    const beforeNoop = await rows();
    assert.equal((await adminService.update(input)).status, 200);
    assert.equal(await prisma.admin_activity_log.count(), count + 1);
    assert.deepEqual(await rows(), beforeNoop);
  });

  await check("maintenance_cas_preserves_concurrent_custom_canonical", async () => {
    await initializedSettings();
    await updateRow("community", { route_path: "/community", canonical_url: "/community" });
    await withRowLock("community", async (blocker, track) => {
      const pending = track(repo.ensureDefaults());
      await waitBlocked("UPDATE", 1);
      await blocker.query(
        "UPDATE site_seo_settings SET canonical_url='/concurrent-custom', updated_at=clock_timestamp() WHERE page_key='community'",
      );
      await blocker.query("COMMIT");
      await pending;
    });
    assert.equal((await read("community")).canonical_url, "/concurrent-custom");
    await repo.ensureDefaults();
    assert.equal((await read("community")).canonical_url, "/concurrent-custom");
    assert.equal((await read("community")).route_path, "/comunidades");
  });

  await check("maintenance_cas_does_not_mutate_concurrent_tombstone", async () => {
    await initializedSettings();
    await updateRow("psychologists", {
      route_path: "/psychologists",
      canonical_url: "/psychologists",
    });
    let snapshot;
    await withRowLock("psychologists", async (blocker, track) => {
      const pending = track(repo.ensureDefaults());
      await waitBlocked("UPDATE", 1);
      snapshot = (
        await blocker.query(
          "UPDATE site_seo_settings SET deleted=true, deleted_at=clock_timestamp(), updated_at=clock_timestamp() WHERE page_key='psychologists' RETURNING id,deleted,deleted_at,updated_at,canonical_url,route_path",
        )
      ).rows[0];
      await blocker.query("COMMIT");
      await pending;
    });
    const after = (
      await monitor.query(
        "SELECT id,deleted,deleted_at,updated_at,canonical_url,route_path FROM site_seo_settings WHERE page_key='psychologists'",
      )
    ).rows[0];
    assert.deepEqual(after, snapshot);
    assert.equal(await repo.findByKey("psychologists"), null);
  });

  await check("competing_maintenance_workers_write_once", async () => {
    await initializedSettings();
    await updateRow("community_detail", { route_path: "/community/[slug]" });
    const count = await writeCount();
    await withRowLock("community_detail", async (blocker, track) => {
      const a = track(repo.ensureDefaults());
      await waitBlocked("UPDATE", 1);
      const b = track(repo.ensureDefaults());
      await waitBlocked("UPDATE", 2);
      await blocker.query("COMMIT");
      await Promise.all([a, b]);
    });
    assert.equal((await read("community_detail")).route_path, "/comunidades/[slug]");
    assert.equal(await writeCount(), count + 1);
  });

  await check("maintenance_preserves_real_audited_repository_update", async () => {
    await initializedSettings();
    await updateRow("community", { route_path: "/community", canonical_url: "/community" });
    const before = await read("community");
    const payload = { ...before, canonical_url: "/audited-concurrent-custom" };
    const count = await prisma.admin_activity_log.count();
    await withRowLock("community", async (blocker, track) => {
      const write = track(
        repo.update("community", payload, {
          adminId: admin.id,
          changedFields: ["URL canônica"],
          settingId: before.id,
          safeBefore: { canonical_url: before.canonical_url },
          safeAfter: { canonical_url: payload.canonical_url },
        }),
      );
      await waitBlocked("UPDATE", 1);
      const sync = track(repo.ensureDefaults());
      await waitBlocked("UPDATE", 2);
      await blocker.query("COMMIT");
      assert.equal((await write).canonical_url, payload.canonical_url);
      await sync;
    });
    const row = await read("community");
    assert.equal(row.canonical_url, payload.canonical_url);
    assert.equal(row.updated_by_admin_id, admin.id);
    assert.equal(await prisma.admin_activity_log.count(), count + 1);
    const log = await prisma.admin_activity_log.findFirst({
      where: { target_id: before.id },
      orderBy: { createdAt: "desc" },
    });
    assert.equal(log.safe_after.canonical_url, payload.canonical_url);
  });

  await check("fixed_id_collision_fails_closed_without_overwriting_unknown_key", async () => {
    await emptySettings();
    const conflictingDefault = defaults.find(
      (setting) => setting.page_key === "community_post_reply",
    );
    await prisma.site_seo_setting.create({
      data: { ...conflictingDefault, page_key: "seo-id-collision" },
    });
    const collision = await read("seo-id-collision");
    const before = await rows();
    const result = await Promise.allSettled([adminService.index()]);
    assert.equal(result[0].status, "rejected");
    assert.deepEqual(await read("seo-id-collision"), collision);
    // Other defaults were missing too: the failed initialization must roll them ALL back.
    assert.deepEqual(await rows(), before);
    assert.equal(await prisma.site_seo_setting.count(), 1);
    assert.equal(await read("community_post_reply"), null);
    const dto = await withoutWrites(publicData);
    assert.equal(
      dto.settings.some((item) => item.page_key === "community_post_reply"),
      false,
    );
  });

  await check("public_warm_dto_stable_and_timestamps_are_persisted", async () => {
    await initializedSettings();
    const before = await rows();
    const count = await writeCount();
    await withoutWrites(async () => {
      const first = await publicData();
      assert.deepEqual(await publicData(), first);
      assert.deepEqual(await repo.list(), first);
      for (const item of first.settings) {
        assertEditorialAndIdentity(
          item,
          before.find((row) => row.id === item.id),
        );
      }
    });
    assert.deepEqual(await rows(), before);
    assert.equal(await writeCount(), count);
  });

  console.log(
    "PROBE_SUMMARY",
    JSON.stringify({ passed, failed: failures.length, total: passed + failures.length }),
  );
  if (failures.length) process.exitCode = 1;
  else console.log("SEO_METADATA_POSTGRES_OK");
})()
  .catch(() => {
    console.log("INTEGRATION_FAILED", step);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await monitor.end();
  });
