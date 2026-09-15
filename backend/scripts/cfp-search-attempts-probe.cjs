// Manual through the isolated runner only. No provider call, HTTP or confirmation operation.
const assert = require("node:assert/strict");
const { setTimeout: pause } = require("node:timers/promises");
assert.equal(process.env.NODE_ENV, "test");
const databaseUrl = new URL(process.env.DATABASE_URL);
assert.equal(databaseUrl.protocol, "postgresql:");
assert.match(databaseUrl.hostname, /^lectum-cfp-(attempts|witness)178-db-[a-f0-9]{20}$/);
assert.equal(databaseUrl.pathname, "/lectum_audit");
assert.equal(databaseUrl.username, "lectum_audit");
assert.equal(databaseUrl.port, "5432");
// The explicit wrapper mode is also the isolated resource namespace, not an app env override.
const witness = databaseUrl.hostname.startsWith("lectum-cfp-witness178-db-");
const { prisma } = require("/app/dist/external/prisma/client.js");
const { Client } = require("/app/node_modules/pg");
const {
  CfpRepository,
} = require("/app/dist/modules/api/private/psychologist/cfp/repositories/CfpRepository.js");
const repository = new CfpRepository();
let sequence = 0;
let passed = 0;
let stage = "initialization";
const failures = [];
const CPF_REQUEST = { cpf: "00000000000" }; // Deliberately invalid, never sent to a provider.
const rawFor = (request, status) => ({
  provider: "infosimples",
  request,
  response: null,
  normalized_results: [],
  attempt_status: status,
});
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
const setup = async () => {
  const user = await prisma.user.create({
    data: {
      name: "Unidade local",
      email: `cfp-attempt-${sequence++}@example.invalid`,
      role: "psicologo",
    },
  });
  return prisma.psychologist_profile.create({ data: { user_id: user.id } });
};
const readProfile = (profile) =>
  prisma.psychologist_profile.findUniqueOrThrow({ where: { id: profile.id } });
const readCheck = (record) =>
  prisma.professional_registry_check.findUniqueOrThrow({ where: { id: record.id } });
const history = (profile) =>
  prisma.professional_registry_check.findMany({
    where: { psychologist_id: profile.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
const snapshot = async (profile) => ({
  profile: await readProfile(profile),
  history: await history(profile),
});
const reserve = (profile, request = CPF_REQUEST, repo = repository) =>
  repo.reserveSearch({ psychologistId: profile.id, request });
const complete = (profile, record, status = "empty", repo = repository) =>
  repo.completeSearch({
    checkId: record.id,
    psychologistId: profile.id,
    found: false,
    raw: rawFor(record.raw.request, status),
  });
const assertReservation = async (profile, response, request, used) => {
  assert.equal(response.ok, true);
  assert.equal(response.used, used);
  assert.equal(response.check.psychologist_id, profile.id);
  assert.equal(response.check.deleted, false);
  assert.equal(response.check.found, false);
  assert.deepEqual(response.check.raw, rawFor(request, "pending"));
  assert.ok(response.check.checked_at instanceof Date);
  assert.deepEqual(await readCheck(response.check), response.check);
};
const assertRefusal = (response, used) => {
  assert.deepEqual(response, { ok: false, reason: "attempts_exceeded", used });
};
const legacyRecord = (profile, data = {}) =>
  prisma.professional_registry_check.create({
    data: {
      psychologist_id: profile.id,
      cpf: CPF_REQUEST.cpf,
      found: false,
      provider: "infosimples",
      raw: rawFor(CPF_REQUEST, "provider_error"),
      ...data,
    },
  });
const seedLegacyCount = async (profile) => {
  await legacyRecord(profile, {
    provider: "manual_admin",
    raw: { source: "manual_admin", decision: "rejected" },
  });
  await legacyRecord(profile);
  await legacyRecord(profile, { cpf: "" }); // Existing count is non-null, not non-empty.
  await legacyRecord(profile, { deleted: true });
  await legacyRecord(profile, { cpf: null });
};

// Used only for two real guarded updates. No Prisma method or application module is replaced.
const concurrentCompletions = async (record, operations) => {
  const blocker = new Client({ connectionString: process.env.DATABASE_URL });
  await blocker.connect();
  let running;
  let barrierError;
  try {
    await blocker.query("BEGIN");
    await blocker.query('SELECT id FROM "professional_registry_checks" WHERE id = $1 FOR UPDATE', [
      record.id,
    ]);
    running = Promise.allSettled(operations.map((operation) => operation()));
    let waiting = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      await blocker.query("SELECT pg_stat_clear_snapshot()");
      const result = await blocker.query(
        "SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND wait_event_type = 'Lock' AND query LIKE '%professional_registry_checks%'",
      );
      if (result.rows[0].n >= operations.length) {
        waiting = true;
        break;
      }
      await pause(20);
    }
    if (!waiting) throw new Error("LOCAL_LOCK_BARRIER_TIMEOUT");
  } catch (error) {
    barrierError = error;
  } finally {
    await blocker.query("ROLLBACK");
    await blocker.end();
  }
  const settled = running ? await running : [];
  if (barrierError) throw barrierError;
  return settled;
};

const legacyWitness = async () => {
  await check("witness_365_contract_is_absent_not_emulated", async () => {
    assert.equal(require("/app/package.json").version, "0.1.365");
    assert.equal(typeof repository.reserveSearch, "undefined");
    assert.equal(typeof repository.completeSearch, "undefined");
  });
  await check("witness_separate_real_counts_and_creates_can_exceed_three", async () => {
    const profile = await setup();
    // Model overlapping callers at the known count/create boundary, with no external request.
    const counts = await Promise.all(
      Array.from({ length: 10 }, () => repository.countCpfSearchAttempts(profile.id)),
    );
    assert.deepEqual(counts, Array(10).fill(0));
    await Promise.all(
      counts.map(() =>
        repository.createCheck({
          psychologistId: profile.id,
          request: CPF_REQUEST,
          found: false,
          raw: rawFor(CPF_REQUEST, "provider_error"),
        }),
      ),
    );
    assert.equal(await repository.countCpfSearchAttempts(profile.id), 10);
    assert.equal((await history(profile)).length, 10);
    assert.deepEqual(await readProfile(profile), profile);
  });
  await check("witness_historical_non_null_cpf_count_includes_manual_and_empty", async () => {
    const profile = await setup();
    await seedLegacyCount(profile);
    assert.equal(await repository.countCpfSearchAttempts(profile.id), 3);
    assert.equal((await history(profile)).length, 5);
  });
};

const reservationContract = async () => {
  assert.equal(typeof repository.reserveSearch, "function");
  assert.equal(typeof repository.completeSearch, "function");
  await check("reservation_is_persisted_pending_without_results_or_identity_write", async () => {
    const profile = await setup();
    const request = { ...CPF_REQUEST, registro: "LOCAL", uf: "LOCAL" };
    const result = await reserve(profile, request);
    await assertReservation(profile, result, request, 1);
    assert.equal(result.check.cpf, CPF_REQUEST.cpf);
    assert.equal(result.check.registro, "LOCAL");
    assert.equal(result.check.uf, "LOCAL");
    assert.equal(await repository.countCpfSearchAttempts(profile.id), 1);
    assert.deepEqual(await readProfile(profile), profile);
  });
  await check("three_sequential_reservations_refuse_fourth_without_new_history", async () => {
    const profile = await setup();
    for (const used of [1, 2, 3])
      await assertReservation(profile, await reserve(profile), CPF_REQUEST, used);
    const before = await snapshot(profile);
    assertRefusal(await reserve(profile), 3);
    assert.deepEqual(await snapshot(profile), before);
  });
  await check("ten_concurrent_real_reservations_persist_only_three", async () => {
    const profile = await setup();
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => reserve(profile, CPF_REQUEST, new CfpRepository())),
    );
    const accepted = responses.filter((response) => response.ok);
    assert.equal(accepted.length, 3);
    assert.deepEqual(accepted.map((response) => response.used).sort(), [1, 2, 3]);
    for (const response of responses.filter((response) => !response.ok)) assertRefusal(response, 3);
    assert.equal(new Set(accepted.map((response) => response.check.id)).size, 3);
    assert.equal((await history(profile)).length, 3);
    assert.equal(await repository.countCpfSearchAttempts(profile.id), 3);
    assert.deepEqual(await readProfile(profile), profile);
  });
  await check("legacy_two_attempts_leave_only_one_concurrent_slot", async () => {
    const profile = await setup();
    const old = [
      await legacyRecord(profile),
      await legacyRecord(profile, { provider: "manual_admin" }),
    ];
    const responses = await Promise.all(Array.from({ length: 6 }, () => reserve(profile)));
    assert.equal(responses.filter((response) => response.ok).length, 1);
    assert.equal(responses.find((response) => response.ok).used, 3);
    for (const response of responses.filter((response) => !response.ok)) assertRefusal(response, 3);
    assert.equal((await history(profile)).length, 3);
    for (const record of old) assert.deepEqual(await readCheck(record), record);
  });
  await check("name_and_registration_searches_do_not_consume_cpf_even_at_limit", async () => {
    const profile = await setup();
    for (let i = 0; i < 3; i++) await reserve(profile);
    for (const request of [{ nome: "Nome unidade local" }, { registro: "LOCAL", uf: "LOCAL" }]) {
      for (let i = 0; i < 2; i++) {
        const response = await reserve(profile, request);
        await assertReservation(profile, response, request, null);
        assert.equal(response.check.cpf, null);
      }
    }
    assert.equal(await repository.countCpfSearchAttempts(profile.id), 3);
    assert.equal((await history(profile)).length, 7);
  });
  await check("manual_failed_and_empty_non_null_legacy_cpf_keep_existing_count", async () => {
    const profile = await setup();
    await seedLegacyCount(profile);
    const before = await snapshot(profile);
    assert.equal(await repository.countCpfSearchAttempts(profile.id), 3);
    assertRefusal(await reserve(profile), 3);
    assert.deepEqual(await snapshot(profile), before);
  });
  await check("soft_deleted_legacy_checks_do_not_count_or_get_rewritten", async () => {
    const profile = await setup();
    const old = await Promise.all(
      Array.from({ length: 4 }, () => legacyRecord(profile, { deleted: true })),
    );
    assert.equal(await repository.countCpfSearchAttempts(profile.id), 0);
    await assertReservation(profile, await reserve(profile), CPF_REQUEST, 1);
    for (const record of old) assert.deepEqual(await readCheck(record), record);
  });
  await check("abandoned_old_pending_reservations_survive_repository_reinstantiation", async () => {
    const profile = await setup();
    for (let i = 0; i < 3; i++) {
      const response = await reserve(profile, CPF_REQUEST, new CfpRepository());
      assert.equal(response.ok, true);
      await prisma.professional_registry_check.update({
        where: { id: response.check.id },
        data: { checked_at: new Date("2000-01-01T00:00:00Z") },
      });
    }
    const before = await snapshot(profile);
    assertRefusal(await reserve(profile, CPF_REQUEST, new CfpRepository()), 3);
    assert.deepEqual(await snapshot(profile), before);
    assert.ok(
      before.history.every((record) => record.raw.attempt_status === "pending" && !record.found),
    );
  });
  await check("concurrent_profiles_have_independent_three_attempt_budgets", async () => {
    const profiles = [await setup(), await setup()];
    const responses = await Promise.all(
      profiles.flatMap((profile) =>
        Array.from({ length: 5 }, async () => ({
          profile,
          response: await reserve(profile),
        })),
      ),
    );
    for (const profile of profiles) {
      const own = responses
        .filter((entry) => entry.profile.id === profile.id)
        .map((entry) => entry.response);
      assert.equal(own.filter((response) => response.ok).length, 3);
      for (const response of own.filter((response) => !response.ok)) assertRefusal(response, 3);
      assert.equal(await repository.countCpfSearchAttempts(profile.id), 3);
      assert.equal((await history(profile)).length, 3);
    }
  });
  await check("missing_or_deleted_profile_is_refused_without_reservation", async () => {
    const profile = await setup();
    await prisma.psychologist_profile.update({
      where: { id: profile.id },
      data: { deleted: true },
    });
    const before = await snapshot(profile);
    for (const id of [profile.id, "missing-local-profile"]) {
      assert.deepEqual(await reserve({ id }), { ok: false, reason: "profile_not_found", used: 0 });
    }
    assert.deepEqual(await snapshot(profile), before);
  });
  await check("successful_empty_completion_updates_only_original_reservation", async () => {
    const profile = await setup();
    const response = await reserve(profile);
    assert.equal(response.ok, true);
    const updated = await complete(profile, response.check);
    assert.equal(updated.id, response.check.id);
    assert.equal(updated.psychologist_id, profile.id);
    assert.equal(updated.checked_at.getTime(), response.check.checked_at.getTime());
    assert.equal(updated.createdAt.getTime(), response.check.createdAt.getTime());
    assert.equal(updated.found, false);
    assert.deepEqual(updated.raw, rawFor(CPF_REQUEST, "empty"));
    assert.deepEqual(await readCheck(response.check), updated);
    assert.equal((await history(profile)).length, 1);
    assert.equal(await repository.countCpfSearchAttempts(profile.id), 1);
    assert.deepEqual(await readProfile(profile), profile);
  });
  await check("failed_and_refused_completion_outcomes_never_refund_reserved_budget", async () => {
    const profile = await setup();
    for (const status of ["provider_error", "provider_unavailable", "provider_validation_error"]) {
      const response = await reserve(profile);
      assert.equal(response.ok, true);
      const updated = await complete(profile, response.check, status);
      assert.deepEqual(updated.raw, rawFor(CPF_REQUEST, status));
      assert.equal(updated.found, false);
    }
    const before = await snapshot(profile);
    assertRefusal(await reserve(profile), 3);
    assert.deepEqual(await snapshot(profile), before);
  });
  await check("duplicate_completion_cannot_replace_empty_or_rejected_terminal_state", async () => {
    for (const status of ["empty", "provider_validation_error"]) {
      const profile = await setup();
      const response = await reserve(profile);
      assert.equal(response.ok, true);
      await complete(profile, response.check, status);
      const before = await snapshot(profile);
      await assert.rejects(() => complete(profile, response.check, "provider_error"));
      assert.deepEqual(await snapshot(profile), before);
    }
  });
  await check("wrong_owner_completion_cannot_touch_either_profile_history", async () => {
    const owner = await setup();
    const other = await setup();
    const response = await reserve(owner);
    assert.equal(response.ok, true);
    const before = [await snapshot(owner), await snapshot(other)];
    await assert.rejects(() => complete(other, response.check));
    assert.deepEqual([await snapshot(owner), await snapshot(other)], before);
    assert.equal((await complete(owner, response.check)).raw.attempt_status, "empty");
  });
  await check("deleted_or_missing_reservation_cannot_be_completed", async () => {
    const profile = await setup();
    const response = await reserve(profile);
    assert.equal(response.ok, true);
    await prisma.professional_registry_check.update({
      where: { id: response.check.id },
      data: { deleted: true },
    });
    const before = await snapshot(profile);
    await assert.rejects(() => complete(profile, response.check));
    await assert.rejects(() =>
      complete(profile, { id: "missing-local-check", raw: { request: CPF_REQUEST } }),
    );
    assert.deepEqual(await snapshot(profile), before);
  });
  await check("historical_confirmation_marker_is_immutable_to_late_completion", async () => {
    const profile = await setup();
    const record = await legacyRecord(profile, {
      raw: {
        ...rawFor(CPF_REQUEST, "success"),
        confirmed_result_key: "local-history-sentinel",
        confirmed_at: "2000-01-01T00:00:00.000Z",
      },
    });
    // Historical-marker fixture only: no result record, confirmation method or profile approval.
    const before = await snapshot(profile);
    await assert.rejects(() => complete(profile, record, "provider_error"));
    assert.deepEqual(await snapshot(profile), before);
    assert.equal((await readProfile(profile)).cfp_verified_at, null);
  });
  await check("two_concurrent_completions_have_one_persisted_winner", async () => {
    const profile = await setup();
    const response = await reserve(profile);
    assert.equal(response.ok, true);
    const outcomes = await concurrentCompletions(response.check, [
      () => complete(profile, response.check, "empty"),
      () => complete(profile, response.check, "provider_error"),
    ]);
    const winners = outcomes.filter((outcome) => outcome.status === "fulfilled");
    assert.equal(winners.length, 1);
    assert.equal(outcomes.filter((outcome) => outcome.status === "rejected").length, 1);
    assert.deepEqual(await readCheck(response.check), winners[0].value);
    assert.equal((await history(profile)).length, 1);
    assert.equal(await repository.countCpfSearchAttempts(profile.id), 1);
    assert.deepEqual(await readProfile(profile), profile);
  });
  await check("completion_after_class_reinstantiation_uses_existing_slot", async () => {
    const profile = await setup();
    const response = await reserve(profile, CPF_REQUEST, new CfpRepository());
    assert.equal(response.ok, true);
    const updated = await complete(profile, response.check, "empty", new CfpRepository());
    assert.equal(updated.id, response.check.id);
    await assertReservation(
      profile,
      await reserve(profile, CPF_REQUEST, new CfpRepository()),
      CPF_REQUEST,
      2,
    );
    assert.equal((await history(profile)).length, 2);
  });
  await check("persisted_pending_attempt_has_explicit_admin_label_without_mutation", async () => {
    const {
      attemptStatusFromRaw,
      mapAttempt,
      resultLabel,
    } = require("/app/dist/modules/api/admin/private/psychologists/registry-verification/use-cases/services/registry-support.js");
    const profile = await setup();
    const response = await reserve(profile);
    assert.equal(response.ok, true);
    const record = await readCheck(response.check);
    const before = structuredClone(record);
    assert.equal(attemptStatusFromRaw(record.raw), "pending");
    assert.equal(resultLabel(record), "Consulta em andamento ou interrompida");
    const mapped = mapAttempt(record);
    assert.equal(mapped.id, record.id);
    assert.equal(mapped.found, false);
    assert.equal(mapped.source, "api_automatica");
    assert.equal(mapped.result_label, "Consulta em andamento ou interrompida");
    assert.deepEqual(record, before);
    assert.deepEqual(await readCheck(record), before);
  });
  await check(
    "real_search_without_document_token_saves_submitted_cpf_but_reserves_nothing",
    async () => {
      // Runner replaces the environment with its allowlist; fail closed rather than unset a token.
      assert.equal(process.env.DOCUMENT_TOKEN, undefined);
      const {
        search,
      } = require("/app/dist/modules/api/private/psychologist/cfp/use-cases/services.js");
      const profile = await setup();
      const auth = await prisma.user.findUniqueOrThrow({ where: { id: profile.user_id } });
      const response = await search({ auth, b: CPF_REQUEST });
      assert.equal(response.status, 503);
      assert.equal(response.success, false);
      assert.equal(response.code, "cfp_provider_config_error");
      const saved = await readProfile(profile);
      assert.equal(saved.cpf, CPF_REQUEST.cpf);
      assert.deepEqual({ ...saved, cpf: profile.cpf, updatedAt: profile.updatedAt }, profile);
      assert.equal(await repository.countCpfSearchAttempts(profile.id), 0);
      assert.deepEqual(await history(profile), []);
      const before = await snapshot(profile);
      const byName = await search({ auth, b: { nome: "Nome unidade local" } });
      assert.equal(byName.status, 503);
      assert.equal(byName.code, "cfp_provider_config_error");
      assert.deepEqual(await snapshot(profile), before);
      // Source returns before provider construction; no spy/transport replacement certifies this path.
    },
  );
};

(async () => {
  assert.equal(await prisma.user.count(), 0);
  assert.equal(await prisma.professional_registry_check.count(), 0);
  if (witness) await legacyWitness();
  else await reservationContract();
  console.log(
    "PROBE_SUMMARY",
    JSON.stringify({ passed, failed: failures.length, total: passed + failures.length }),
  );
  if (failures.length) process.exitCode = 1;
  else console.log(witness ? "CFP_LEGACY_WITNESS_OK" : "CFP_SEARCH_ATTEMPTS_OK");
})()
  .catch((error) => {
    const code = /^P\d{4}$/.test(error?.code ?? "") ? error.code : "none";
    const kind = [
      "Error",
      "TypeError",
      "DriverAdapterError",
      "PrismaClientKnownRequestError",
      "PrismaClientUnknownRequestError",
      "PrismaClientValidationError",
      "PrismaClientInitializationError",
    ].includes(error?.name)
      ? error.name
      : "other";
    // Closed diagnostic vocabulary only; never emit message, SQL, stack or adapter metadata.
    const message = typeof error?.message === "string" ? error.message : "";
    const signals = {
      timeout: /timeout|timed out/i.test(message),
      pool: /connection pool|maxwait|max wait/i.test(message),
      serialization: /serializ|write.?conflict/i.test(message),
      deadlock: /deadlock/i.test(message),
      transactionClosed: /transaction.*closed|transaction.*expired/i.test(message),
      localBarrier: message === "LOCAL_LOCK_BARRIER_TIMEOUT",
    };
    const causeKind = [
      "TransactionWriteConflict",
      "DatabaseNotReachable",
      "SocketTimeout",
    ].includes(error?.cause?.kind)
      ? error.cause.kind
      : "other";
    const sqlState = ["40001", "40P01", "53300", "57014"].includes(error?.cause?.originalCode)
      ? error.cause.originalCode
      : "none";
    console.error(
      "INTEGRATION_FAILED",
      JSON.stringify({ stage, kind, code, causeKind, sqlState, signals }),
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
