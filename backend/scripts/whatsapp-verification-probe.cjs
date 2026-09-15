// Manual only through whatsapp-verification-integration.mjs. Repository calls, never SMS/HTTP.
const assert = require("node:assert/strict");
const { setTimeout: pause } = require("node:timers/promises");

assert.deepEqual(Object.keys(process.env).sort(), [
  "ADMIN_JWT_SECRET",
  "CRYPTO_ALGORITHM",
  "DATABASE_URL",
  "JWT_SECRET_KEY",
  "NODE_ENV",
  "PATH",
]);
assert.equal(process.env.NODE_ENV, "test");
const databaseUrl = new URL(process.env.DATABASE_URL);
assert.equal(databaseUrl.protocol, "postgresql:");
assert.match(databaseUrl.hostname, /^lectum-whatsapp178-db-[a-f0-9]{20}$/);
assert.equal(databaseUrl.pathname, "/lectum_audit");
assert.equal(databaseUrl.username, "lectum_audit");
assert.equal(databaseUrl.port, "5432");

const { prisma } = require("/app/dist/external/prisma/client.js");
const { Client } = require("/app/node_modules/pg");
const argon2 = require("/app/node_modules/argon2");
const {
  WhatsappVerificationRepository,
} = require("/app/dist/modules/api/private/psychologist/whatsapp-verification/repositories/WhatsappVerificationRepository.js");
const {
  FreeProfileRepository,
} = require("/app/dist/modules/api/private/psychologist/free-profile/repositories/FreeProfileRepository.js");
const repository = new WhatsappVerificationRepository();
const freeProfile = new FreeProfileRepository();

// Deliberately invalid contact labels, local repository inputs only; no public validator.
const PHONE_A = "LOCAL-NUMBER-A";
const PHONE_B = "LOCAL-NUMBER-B";
const PURPOSE = "psychologist_whatsapp";
let hashA;
let hashB;
let sequence = 0;
let passed = 0;
let stage = "initialization";
const failures = [];
const check = async (name, operation) => {
  stage = name;
  try {
    await operation();
    passed++;
    console.log("CHECK_OK", name);
  } catch (error) {
    if (!(error instanceof assert.AssertionError)) throw error;
    failures.push(name);
    console.log("CHECK_FAIL", name);
  }
};

// Same real PostgreSQL row-lock barrier as the registry probe, without importing its autorun.
// A mismatched-number confirmation may finish immediately; the valid writer must still wait.
const concurrentWhileProfileLocked = async (profileId, operations, minimumBlocked = 2) => {
  const blocker = new Client({ connectionString: process.env.DATABASE_URL });
  await blocker.connect();
  let running;
  let completed = 0;
  let barrierError;
  try {
    await blocker.query("BEGIN");
    await blocker.query('SELECT id FROM "psychologist_profiles" WHERE id = $1 FOR UPDATE', [
      profileId,
    ]);
    running = Promise.allSettled(
      operations.map(async (operation) => {
        try {
          return await operation();
        } finally {
          completed++;
        }
      }),
    );
    let waiting = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      await blocker.query("SELECT pg_stat_clear_snapshot()");
      const result = await blocker.query(
        "SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND wait_event_type = 'Lock' AND (query LIKE $1 OR query LIKE $2)",
        ["%psychologist_profiles%", "%phone_verifications%"],
      );
      if (result.rows[0].n >= minimumBlocked && result.rows[0].n + completed >= operations.length) {
        waiting = true;
        break;
      }
      await pause(20);
    }
    if (!waiting) throw new Error("LOCAL_LOCK_BARRIER_TIMEOUT");
  } catch (error) {
    barrierError = error;
  } finally {
    try {
      await blocker.query("ROLLBACK");
    } finally {
      await blocker.end();
    }
  }
  const settled = running ? await running : [];
  if (barrierError) throw barrierError;
  for (const result of settled) if (result.status === "rejected") throw result.reason;
  return settled.map((result) => result.value);
};

const createUser = () =>
  prisma.user.create({
    data: {
      name: "Unidade WhatsApp local",
      email: `whatsapp-${sequence++}@example.invalid`,
      role: "psicologo",
    },
  });
const createCode = (item, data = {}) =>
  prisma.phone_verification.create({
    data: {
      user_id: item.user.id,
      phone: PHONE_A,
      purpose: PURPOSE,
      provider: "local_audit",
      code_hash: hashA,
      expires_at: new Date(Date.now() + 600_000),
      ...data,
    },
  });
const setup = async (profileData = {}) => {
  const user = await createUser();
  const profile = await prisma.psychologist_profile.create({
    data: { user_id: user.id, whatsapp: PHONE_A, ...profileData },
  });
  const item = { user, profile };
  return { ...item, code: await createCode(item) };
};
const readProfile = (item) =>
  prisma.psychologist_profile.findUniqueOrThrow({ where: { id: item.profile.id } });
const readCode = (code) => prisma.phone_verification.findUniqueOrThrow({ where: { id: code.id } });
const snapshot = async (item) => ({
  profile: await readProfile(item),
  code: await readCode(item.code),
});
const confirm = (verification) =>
  repository.confirmVerification({ verification, verifiedAt: new Date() });
const save = (item, phone) => repository.saveWhatsapp({ userId: item.user.id, phone });
const assertConfirmed = async (item, result) => {
  const profile = await readProfile(item);
  const code = await readCode(item.code);
  assert.ok(result);
  assert.equal(result.phone, code.phone);
  assert.equal(profile.whatsapp, code.phone);
  assert.ok(profile.whatsapp_verified_at instanceof Date);
  assert.equal(profile.whatsapp_verified_at.getTime(), code.verified_at?.getTime());
  assert.equal(result.whatsapp_verified_at.getTime(), code.verified_at.getTime());
};

// Same full-body shape used by the isolated registry probe; no PII, catalogs or media fixtures.
const freeBody = (whatsapp) => ({
  name: "Unidade WhatsApp local atualizada",
  professional_first_name: null,
  professional_last_name: null,
  cpf: "00000000000",
  crp_region: "LOCAL",
  crp_number: "0",
  birthdate: null,
  headline: "Campo local",
  bio: null,
  modality: null,
  gender: null,
  race_color: null,
  religion: null,
  whatsapp,
  languages: [],
  target_audience: [],
  discount_first_session: false,
  social_value: false,
  accepts_insurance: false,
  show_experience_tag: true,
  academic: { title: null, institution: null, graduation_year: null },
  academic_formations: [],
  available_days: [],
  specialty_ids: [],
  service_ids: [],
  approach_ids: [],
  address: {
    street: null,
    number: null,
    complement: null,
    district: null,
    zip: null,
    city: null,
    state: null,
  },
  published: false,
});
const editFree = (item, phone) =>
  freeProfile.update(item.user.id, freeBody(phone), {
    canUploadVideo: true,
    lockIdentityFields: true,
  });

(async () => {
  hashA = await argon2.hash("LOCAL-OTP-A");
  hashB = await argon2.hash("LOCAL-OTP-B");

  await check("valid_current_number_is_verified", async () => {
    const item = await setup();
    const before = await readProfile(item);
    await assertConfirmed(item, await confirm(item.code));
    assert.equal((await readProfile(item)).whatsapp, before.whatsapp);
  });

  await check("repeated_confirmation_has_no_writes", async () => {
    const item = await setup();
    await confirm(item.code);
    const before = await snapshot(item);
    assert.equal(await confirm(item.code), null);
    assert.deepEqual(await snapshot(item), before);
  });

  await check("save_invalidates_pending_but_preserves_history_and_other_owners", async () => {
    const item = await setup({ whatsapp_verified_at: new Date() });
    const other = await setup();
    const history = await createCode(item, { verified_at: new Date() });
    const otherPurpose = await createCode(item, { purpose: "local_other_purpose" });
    assert.deepEqual(await save(item, PHONE_B), { phone: PHONE_B, whatsapp_verified_at: null });
    const profile = await readProfile(item);
    assert.equal(profile.whatsapp, PHONE_B);
    assert.equal(profile.whatsapp_verified_at, null);
    assert.equal((await readCode(item.code)).deleted, true);
    assert.ok((await readCode(item.code)).deletedAt instanceof Date);
    assert.deepEqual(await readCode(history), history);
    assert.deepEqual(await readCode(otherPurpose), otherPurpose);
    assert.deepEqual(await readCode(other.code), other.code);
    assert.equal(await confirm(item.code), null);
    assert.equal((await readProfile(item)).whatsapp, PHONE_B);
  });

  await check("save_without_active_profile_returns_null", async () => {
    const user = await createUser();
    assert.equal(await repository.saveWhatsapp({ userId: user.id, phone: PHONE_B }), null);
    const deleted = await setup({ deleted: true });
    const before = await snapshot(deleted);
    assert.equal(await save(deleted, PHONE_B), null);
    assert.deepEqual(await snapshot(deleted), before);
  });

  const invalidations = [
    ["expired_in_database", async () => ({ expires_at: new Date(Date.now() - 60_000) })],
    ["deleted_in_database", async () => ({ deleted: true, deletedAt: new Date() })],
    ["attempts_exhausted_in_database", async () => ({ attempts: 5 })],
    ["hash_changed_in_database", async () => ({ code_hash: hashB })],
    ["challenge_phone_changed_in_database", async () => ({ phone: PHONE_B })],
    ["owner_changed_in_database", async () => ({ user_id: (await createUser()).id })],
    ["purpose_changed_in_database", async () => ({ purpose: "local_other_purpose" })],
    [
      "profile_phone_changed_in_database",
      async (item) => {
        await prisma.psychologist_profile.update({
          where: { id: item.profile.id },
          data: { whatsapp: PHONE_B },
        });
        return {};
      },
    ],
  ];
  for (const [name, invalidate] of invalidations) {
    await check(name, async () => {
      const item = await setup();
      await prisma.phone_verification.update({
        where: { id: item.code.id },
        data: await invalidate(item),
      });
      const before = await snapshot(item);
      assert.equal(await confirm(item.code), null);
      assert.deepEqual(await snapshot(item), before);
    });
  }

  await check("confirmation_requires_existing_code_and_active_profile", async () => {
    const item = await setup();
    const before = await snapshot(item);
    let result;
    await assert.doesNotReject(async () => {
      result = await confirm({ ...item.code, id: "LOCAL-MISSING-CHALLENGE" });
    });
    assert.equal(result, null);
    assert.deepEqual(await snapshot(item), before);
    await prisma.psychologist_profile.update({
      where: { id: item.profile.id },
      data: { deleted: true },
    });
    const deletedSnapshot = await snapshot(item);
    assert.equal(await confirm(item.code), null);
    assert.deepEqual(await snapshot(item), deletedSnapshot);
  });

  await check("attempts_only_increment_pending_valid_codes_and_stop_at_five", async () => {
    for (const data of [
      { deleted: true },
      { verified_at: new Date() },
      { expires_at: new Date(Date.now() - 60_000) },
      { purpose: "local_other_purpose" },
      { attempts: 5 },
    ]) {
      const item = await setup();
      const code = await createCode(item, data);
      await repository.incrementAttempts(code.id);
      assert.deepEqual(await readCode(code), code);
    }
    const item = await setup();
    await prisma.phone_verification.update({ where: { id: item.code.id }, data: { attempts: 4 } });
    await Promise.all([
      repository.incrementAttempts(item.code.id),
      repository.incrementAttempts(item.code.id),
    ]);
    assert.equal((await readCode(item.code)).attempts, 5);
  });

  await check("same_code_concurrent_confirmation_has_one_winner", async () => {
    const item = await setup();
    const results = await concurrentWhileProfileLocked(item.profile.id, [
      () => confirm(item.code),
      () => confirm(item.code),
    ]);
    assert.equal(results.filter((result) => result !== null).length, 1);
    await assertConfirmed(
      item,
      results.find((result) => result !== null),
    );
  });

  await check("save_racing_confirmation_never_restores_old_phone", async () => {
    const item = await setup();
    await concurrentWhileProfileLocked(item.profile.id, [
      () => save(item, PHONE_B),
      () => confirm(item.code),
    ]);
    const state = await snapshot(item);
    assert.equal(state.profile.whatsapp, PHONE_B);
    assert.equal(state.profile.whatsapp_verified_at, null);
    assert.ok(state.code.deleted || state.code.verified_at !== null);
    assert.equal(await confirm(item.code), null);
    assert.deepEqual(await snapshot(item), state);
  });

  await check("concurrent_different_numbers_only_verifies_current_number", async () => {
    const item = await setup({ whatsapp: PHONE_B });
    const current = await createCode(item, { phone: PHONE_B });
    const [oldResult, currentResult] = await concurrentWhileProfileLocked(
      item.profile.id,
      [() => confirm(item.code), () => confirm(current)],
      1,
    );
    assert.equal(oldResult, null);
    assert.equal((await readCode(item.code)).verified_at, null);
    await assertConfirmed({ ...item, code: current }, currentResult);
  });

  await check("free_profile_changed_number_resets_stamp_and_invalidates_old_codes", async () => {
    const item = await setup({ whatsapp_verified_at: new Date() });
    const matchingNew = await createCode(item, { phone: PHONE_B });
    const other = await setup();
    assert.ok(await editFree(item, PHONE_B));
    const state = await snapshot(item);
    assert.equal(state.profile.whatsapp, PHONE_B);
    assert.equal(state.profile.whatsapp_verified_at, null);
    assert.equal(state.code.deleted, true);
    assert.deepEqual(await readCode(matchingNew), matchingNew);
    assert.deepEqual(await readCode(other.code), other.code);
    assert.equal(await confirm(item.code), null);
    assert.deepEqual(await snapshot(item), state);
  });

  await check("free_profile_unchanged_number_preserves_stamp_and_matching_code", async () => {
    const item = await setup({ whatsapp_verified_at: new Date() });
    const before = await snapshot(item);
    assert.ok(await editFree(item, PHONE_A));
    const profile = await readProfile(item);
    assert.equal(profile.whatsapp, PHONE_A);
    assert.equal(
      profile.whatsapp_verified_at.getTime(),
      before.profile.whatsapp_verified_at.getTime(),
    );
    assert.deepEqual(await readCode(item.code), before.code);
  });

  await check("free_profile_cleared_number_invalidates_pending_codes", async () => {
    const item = await setup({ whatsapp_verified_at: new Date() });
    assert.ok(await editFree(item, null));
    const state = await snapshot(item);
    assert.equal(state.profile.whatsapp, null);
    assert.equal(state.profile.whatsapp_verified_at, null);
    assert.equal(state.code.deleted, true);
    assert.equal(await confirm(item.code), null);
    assert.deepEqual(await snapshot(item), state);
  });

  console.log(
    "PROBE_SUMMARY",
    JSON.stringify({ passed, failed: failures.length, total: passed + failures.length }),
  );
  if (failures.length) process.exitCode = 1;
  else console.log("WHATSAPP_POSTGRES_OK");
})()
  .catch((error) => {
    const code = /^P\d{4}$/.test(error?.code ?? "") ? error.code : "none";
    const kind = [
      "TypeError",
      "PrismaClientValidationError",
      "PrismaClientKnownRequestError",
      "AssertionError",
    ].includes(error?.name)
      ? error.name
      : "other";
    console.error("INTEGRATION_FAILED", JSON.stringify({ stage, kind, code }));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
