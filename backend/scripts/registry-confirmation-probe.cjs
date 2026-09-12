// Manual only through registry-confirmation-integration.mjs. No HTTP, provider or app bootstrap.
const assert = require("node:assert/strict");
const { setTimeout: pause } = require("node:timers/promises");
assert.equal(process.env.NODE_ENV, "test");
const databaseUrl = new URL(process.env.DATABASE_URL);
assert.equal(databaseUrl.protocol, "postgresql:");
assert.match(databaseUrl.hostname, /^lectum-registry178-db-[a-f0-9]{20}$/);
assert.equal(databaseUrl.pathname, "/lectum_audit");
assert.equal(databaseUrl.username, "lectum_audit");
assert.equal(databaseUrl.port, "5432");
const { prisma } = require("/app/dist/external/prisma/client.js");
const { Client } = require("/app/node_modules/pg");
const {
  CfpRepository,
} = require("/app/dist/modules/api/private/psychologist/cfp/repositories/CfpRepository.js");
const {
  AdminPsychologistRegistryVerificationRepository,
} = require("/app/dist/modules/api/admin/private/psychologists/registry-verification/repositories/AdminPsychologistRegistryVerificationRepository.js");
const automatic = new CfpRepository();
const manual = new AdminPsychologistRegistryVerificationRepository();
const {
  FreeProfileRepository,
} = require("/app/dist/modules/api/private/psychologist/free-profile/repositories/FreeProfileRepository.js");
const {
  isProfessionalIdentityLocked,
} = require("/app/dist/modules/api/private/psychologist/free-profile/repositories/support/profile-response.js");
const freeProfile = new FreeProfileRepository();
let passed = 0;
let stage = "initialization";
let sequence = 0;
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

// Real scheduling barrier. Same-check legacy writes can wait on the check row before
// reaching the profile, so observe both tables. No repository/Prisma method is replaced.
const concurrentWhileProfileLocked = async (profileId, operations) => {
  const blocker = new Client({ connectionString: process.env.DATABASE_URL });
  await blocker.connect();
  let running;
  let barrierError;
  try {
    await blocker.query("BEGIN");
    await blocker.query('SELECT id FROM "psychologist_profiles" WHERE id = $1 FOR UPDATE', [
      profileId,
    ]);
    running = Promise.allSettled(operations.map((operation) => operation()));
    let waiting = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      await blocker.query("SELECT pg_stat_clear_snapshot()");
      const result = await blocker.query(
        "SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND wait_event_type = 'Lock' AND (query LIKE $1 OR query LIKE $2)",
        ["%psychologist_profiles%", "%professional_registry_checks%"],
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
  for (const result of settled) if (result.status === "rejected") throw result.reason;
  return settled.map((result) => result.value);
};

// Intentionally invalid CPF digits and non-production registry labels: local DB input,
// not a provider response, public request, identity proof or validator-bypass test.
const LOCAL_CPF = "00000000000";
const OTHER_CPF = "11111111111";
const resultFor = (key = `local-result-${sequence++}`, registration = "100") => ({
  key,
  nome: "Unidade local sem identidade real",
  nome_regional: "LOCAL-UNIT",
  registro: registration,
  situacao: "ATIVO",
  data_inscricao: "01/01/2020",
  active: true,
});
const readProfile = (item) =>
  prisma.psychologist_profile.findUniqueOrThrow({ where: { id: item.profile.id } });
const readCheck = (record) =>
  prisma.professional_registry_check.findUniqueOrThrow({ where: { id: record.id } });
const history = (item) =>
  prisma.professional_registry_check.findMany({
    where: { psychologist_id: item.profile.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
const snapshot = async (item) => ({
  profile: await readProfile(item),
  history: await history(item),
});
const createCheck = async (item, results = [resultFor()], cpf = LOCAL_CPF) => ({
  results,
  record: await automatic.createCheck({
    psychologistId: item.profile.id,
    request: { cpf, registro: results[0].registro, uf: "LOCAL" },
    found: true,
    raw: {
      provider: "infosimples",
      request: { cpf },
      response: null,
      normalized_results: results,
    },
  }),
});
const setup = async (profileData = {}) => {
  const user = await prisma.user.create({
    data: {
      name: "Unidade registro local",
      email: `registry-${sequence++}@example.invalid`,
      role: "psicologo",
    },
  });
  const profile = await prisma.psychologist_profile.create({
    data: { user_id: user.id, cpf: OTHER_CPF, ...profileData },
  });
  const item = { profile, user };
  return { ...item, ...(await createCheck(item)) };
};
// Baseline358 returns only the profile. Normalize that success shape, never behavior;
// do not fabricate a normalized result that the baseline did not actually return.
const confirm = async (record, result) => {
  const response = await automatic.confirmResult({ check: record, result });
  if (typeof response?.ok === "boolean") return response;
  assert.ok(response && typeof response.id === "string");
  return { ok: true, data: { profile: response } };
};
const assertFailure = (response, reason) => {
  assert.equal(response.ok, false);
  if (Array.isArray(reason)) assert.ok(reason.includes(response.reason));
  else assert.equal(response.reason, reason);
};
const assertConfirmed = async (item, record, selected) => {
  const profile = await readProfile(item);
  const saved = await readCheck(record);
  assert.equal(profile.crp_status, "aprovado");
  assert.equal(profile.cpf, saved.cpf);
  assert.equal(profile.crp, `${selected.nome_regional}/${selected.registro}`);
  assert.equal(profile.crp_registration_date.toISOString(), "2020-01-01T15:00:00.000Z");
  assert.ok(profile.cfp_verified_at instanceof Date);
  assert.equal(saved.raw.confirmed_result_key, selected.key);
  assert.equal(saved.raw.confirmed_at, profile.cfp_verified_at.toISOString());
};
const expectedProfile = async (item) => {
  const profile = await manual.findPsychologist(item.profile.id);
  assert.ok(profile);
  return profile;
};
const manualArgs = (initial, approve) => ({
  expectedProfile: initial,
  checkedAt: new Date(),
  cpf: approve ? OTHER_CPF : initial.cpf,
  crp: "LOCAL-UNIT/900",
  registrationDate: new Date("2020-01-01T15:00:00.000Z"),
  registrationNumber: "900",
  regionalCrp: "LOCAL-UNIT",
  raw: {
    source: "manual_admin",
    decision: approve ? "approved" : "rejected",
    previous: {
      cpf: initial.cpf,
      crp: initial.crp,
      crp_status: initial.crp_status,
      cfp_verified_at: initial.cfp_verified_at?.toISOString() ?? null,
    },
    reason: "Somente fixture local descartável",
  },
});
const decide = (item, initial, approve) =>
  approve
    ? manual.approveManual(item.profile.id, manualArgs(initial, true))
    : manual.rejectManual(item.profile.id, manualArgs(initial, false));
const entitlement = async (item, source) => {
  const plan = await prisma.subscription_plan.create({
    data: {
      slug: `registry-local-${sequence++}`,
      name: "Plano local",
      active: true,
      price_cents: 1000,
    },
  });
  return prisma.professional_subscription.create({
    data: { psychologist_id: item.profile.id, plan_id: plan.id, status: "ativa", source },
  });
};
const courtesy = (item) => entitlement(item, "admin_grant");
const manualSetup = async () => {
  const item = await setup();
  await entitlement(item, "gateway");
  return item;
};
const freeBody = () => ({
  name: "Nome local atualizado",
  professional_first_name: null,
  professional_last_name: null,
  cpf: LOCAL_CPF,
  crp_region: "LOCAL-EDIT",
  crp_number: "300",
  birthdate: null,
  headline: "Campo não identitário local",
  bio: null,
  modality: null,
  gender: null,
  race_color: null,
  religion: null,
  whatsapp: null,
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
const editFree = (item) =>
  freeProfile.update(item.user.id, freeBody(), {
    canUploadVideo: true,
    lockIdentityFields: false,
  });
const identity = (profile) => ({
  cpf: profile.cpf,
  crp: profile.crp,
  crp_status: profile.crp_status,
  crp_registration_date: profile.crp_registration_date,
  cfp_verified_at: profile.cfp_verified_at,
});
const protectedProfileData = (kind) =>
  kind === "approved"
    ? { crp_status: "aprovado" }
    : kind === "evidence"
      ? { cfp_verified_at: new Date("2020-01-01T00:00:00Z") }
      : kind === "rejected"
        ? { crp_status: "rejeitado", cpf: null, crp: null }
        : {};

(async () => {
  assert.equal(await prisma.user.count(), 0);
  assert.equal(await prisma.professional_registry_check.count(), 0);

  await check("automatic_confirmation_persists_identity_and_history_atomically", async () => {
    const item = await setup();
    const response = await confirm(item.record, item.results[0]);
    assert.equal(response.ok, true);
    assert.equal(response.data.profile.id, item.profile.id);
    if (response.data.result) assert.deepEqual(response.data.result, item.results[0]);
    await assertConfirmed(item, item.record, item.results[0]);
  });
  await check("identical_retry_preserves_identity_timestamps_and_check", async () => {
    const item = await setup();
    assert.equal((await confirm(item.record, item.results[0])).ok, true);
    const before = await snapshot(item);
    await pause(20);
    const again = await confirm(item.record, item.results[0]);
    assert.equal(again.ok, true);
    assert.equal(
      again.data.profile.cfp_verified_at.getTime(),
      before.profile.cfp_verified_at.getTime(),
    );
    assert.deepEqual(await snapshot(item), before);
  });
  await check("different_result_on_same_confirmed_check_is_not_retry", async () => {
    const item = await setup();
    const second = resultFor(undefined, "200");
    item.record = await prisma.professional_registry_check.update({
      where: { id: item.record.id },
      data: { raw: { ...item.record.raw, normalized_results: [item.results[0], second] } },
    });
    await confirm(item.record, item.results[0]);
    const before = await snapshot(item);
    assertFailure(await confirm(item.record, second), "profile_locked");
    assert.deepEqual(await snapshot(item), before);
  });
  for (const sameIdentity of [false, true]) {
    await check(
      `other_check_${sameIdentity ? "same" : "different"}_identity_is_not_retry`,
      async () => {
        const item = await setup();
        const other = await createCheck(item, [resultFor(undefined, sameIdentity ? "100" : "200")]);
        await confirm(item.record, item.results[0]);
        const before = await snapshot(item);
        assertFailure(await confirm(other.record, other.results[0]), "profile_locked");
        assert.deepEqual(await snapshot(item), before);
      },
    );
  }
  await check("manual_approval_blocks_automatic_replacement", async () => {
    const item = await manualSetup();
    assert.ok(await decide(item, await expectedProfile(item), true));
    const before = await snapshot(item);
    assertFailure(await confirm(item.record, item.results[0]), "profile_locked");
    assert.deepEqual(await snapshot(item), before);
  });
  await check("existing_evidence_blocks_replacement_even_with_pending_status", async () => {
    const item = await setup({
      cfp_verified_at: new Date("2020-01-01T00:00:00Z"),
      crp: "LOCAL/OLD",
    });
    const before = await snapshot(item);
    assertFailure(await confirm(item.record, item.results[0]), "profile_locked");
    assert.deepEqual(await snapshot(item), before);
  });
  await check("manual_rejection_cannot_be_reversed_automatically", async () => {
    const item = await manualSetup();
    assert.ok(await decide(item, await expectedProfile(item), false));
    const before = await snapshot(item);
    assertFailure(await confirm(item.record, item.results[0]), "profile_locked");
    assert.deepEqual(await snapshot(item), before);
  });
  await check("submitted_cpf_does_not_change_manually_rejected_profile", async () => {
    const item = await manualSetup();
    await decide(item, await expectedProfile(item), false);
    const before = await snapshot(item);
    await automatic.saveSubmittedCpf({ psychologistId: item.profile.id, cpf: LOCAL_CPF });
    assert.deepEqual(await snapshot(item), before);
  });
  await check("active_courtesy_blocks_automatic_identity_replacement", async () => {
    const item = await setup();
    const grant = await courtesy(item);
    const before = await snapshot(item);
    assertFailure(await confirm(item.record, item.results[0]), "profile_locked");
    assert.deepEqual(await snapshot(item), before);
    assert.deepEqual(
      await prisma.professional_subscription.findUnique({ where: { id: grant.id } }),
      grant,
    );
  });
  await check("check_reassigned_after_snapshot_cannot_confirm_old_owner", async () => {
    const item = await setup();
    const other = await setup();
    await prisma.professional_registry_check.update({
      where: { id: item.record.id },
      data: { psychologist_id: other.profile.id },
    });
    const before = [await snapshot(item), await snapshot(other)];
    assertFailure(await confirm(item.record, item.results[0]), "check_not_found");
    assert.deepEqual([await snapshot(item), await snapshot(other)], before);
  });
  await check("check_deleted_after_snapshot_cannot_confirm", async () => {
    const item = await setup();
    await prisma.professional_registry_check.update({
      where: { id: item.record.id },
      data: { deleted: true },
    });
    const before = await snapshot(item);
    assertFailure(await confirm(item.record, item.results[0]), "check_not_found");
    assert.deepEqual(await snapshot(item), before);
  });
  await check("deleted_profile_cannot_receive_confirmation_or_history", async () => {
    const item = await setup();
    await prisma.psychologist_profile.update({
      where: { id: item.profile.id },
      data: { deleted: true },
    });
    const before = await snapshot(item);
    assertFailure(await confirm(item.record, item.results[0]), [
      "profile_locked",
      "check_not_found",
    ]);
    assert.deepEqual(await snapshot(item), before);
  });
  await check("result_removed_after_snapshot_is_not_found", async () => {
    const item = await setup();
    await prisma.professional_registry_check.update({
      where: { id: item.record.id },
      data: { raw: { ...item.record.raw, normalized_results: [] } },
    });
    const before = await snapshot(item);
    assertFailure(await confirm(item.record, item.results[0]), "result_not_found");
    assert.deepEqual(await snapshot(item), before);
  });
  await check("persisted_inactive_result_rejects_stale_active_snapshot", async () => {
    const item = await setup();
    await prisma.professional_registry_check.update({
      where: { id: item.record.id },
      data: {
        raw: { ...item.record.raw, normalized_results: [{ ...item.results[0], active: false }] },
      },
    });
    const before = await snapshot(item);
    assertFailure(await confirm(item.record, item.results[0]), "result_not_active");
    assert.deepEqual(await snapshot(item), before);
  });
  await check("confirmation_uses_current_persisted_result_not_stale_identity", async () => {
    const item = await setup();
    const current = { ...item.results[0], registro: "200" };
    await prisma.professional_registry_check.update({
      where: { id: item.record.id },
      data: { cpf: OTHER_CPF, raw: { ...item.record.raw, normalized_results: [current] } },
    });
    const response = await confirm(item.record, item.results[0]);
    assert.equal(response.ok, true);
    if (response.data.result) assert.deepEqual(response.data.result, current);
    await assertConfirmed(item, item.record, current);
  });
  await check("two_identical_concurrent_confirmations_share_original_timestamp", async () => {
    const item = await setup();
    const results = await concurrentWhileProfileLocked(item.profile.id, [
      () => confirm(item.record, item.results[0]),
      async () => {
        await pause(20);
        return confirm(item.record, item.results[0]);
      },
    ]);
    assert.ok(results.every((result) => result.ok));
    assert.equal(
      results[0].data.profile.cfp_verified_at.getTime(),
      results[1].data.profile.cfp_verified_at.getTime(),
    );
    await assertConfirmed(item, item.record, item.results[0]);
  });
  await check("concurrent_alternative_keys_on_same_check_have_one_winner", async () => {
    const item = await setup();
    const second = resultFor(undefined, "200");
    item.record = await prisma.professional_registry_check.update({
      where: { id: item.record.id },
      data: { raw: { ...item.record.raw, normalized_results: [item.results[0], second] } },
    });
    const selected = [item.results[0], second];
    const responses = await concurrentWhileProfileLocked(
      item.profile.id,
      selected.map((result) => () => confirm(item.record, result)),
    );
    assert.equal(responses.filter((response) => response.ok).length, 1);
    const winner = responses.findIndex((response) => response.ok);
    assertFailure(responses[1 - winner], "profile_locked");
    await assertConfirmed(item, item.record, selected[winner]);
  });
  await check("concurrent_different_checks_confirm_only_winning_history", async () => {
    const item = await setup();
    const other = await createCheck(item, [resultFor(undefined, "200")], OTHER_CPF);
    const candidates = [item, other];
    const responses = await concurrentWhileProfileLocked(
      item.profile.id,
      candidates.map((candidate) => () => confirm(candidate.record, candidate.results[0])),
    );
    assert.equal(responses.filter((response) => response.ok).length, 1);
    const winner = responses.findIndex((response) => response.ok);
    assertFailure(responses[1 - winner], "profile_locked");
    await assertConfirmed(item, candidates[winner].record, candidates[winner].results[0]);
    assert.deepEqual(await readCheck(candidates[1 - winner].record), candidates[1 - winner].record);
  });
  for (const approve of [false, true]) {
    await check(
      `concurrent_automatic_and_manual_${approve ? "approval" : "rejection"}_respect_cas`,
      async () => {
        const item = await manualSetup();
        const initial = await expectedProfile(item);
        const [autoResult, manualResult] = await concurrentWhileProfileLocked(item.profile.id, [
          () => confirm(item.record, item.results[0]),
          () => decide(item, initial, approve),
        ]);
        assert.equal(Number(autoResult.ok) + Number(Boolean(manualResult)), 1);
        const records = await history(item);
        assert.equal(
          records.filter((record) => record.provider === "manual_admin").length,
          manualResult ? 1 : 0,
        );
        if (autoResult.ok) {
          assert.equal(manualResult, null);
          await assertConfirmed(item, item.record, item.results[0]);
        } else {
          assertFailure(autoResult, "profile_locked");
          assert.equal((await readProfile(item)).crp_status, approve ? "aprovado" : "rejeitado");
          assert.deepEqual(await readCheck(item.record), item.record);
        }
      },
    );
  }
  for (const approve of [false, true]) {
    await check(
      `stale_manual_${approve ? "approval" : "rejection"}_after_auto_has_no_history`,
      async () => {
        const item = await manualSetup();
        const initial = await expectedProfile(item);
        await confirm(item.record, item.results[0]);
        const before = await snapshot(item);
        assert.equal(await decide(item, initial, approve), null);
        assert.deepEqual(await snapshot(item), before);
      },
    );
  }
  await check("concurrent_opposing_manual_decisions_have_one_history", async () => {
    const item = await manualSetup();
    const initial = await expectedProfile(item);
    const responses = await concurrentWhileProfileLocked(item.profile.id, [
      () => decide(item, initial, true),
      () => decide(item, initial, false),
    ]);
    assert.equal(responses.filter(Boolean).length, 1);
    const records = (await history(item)).filter((record) => record.provider === "manual_admin");
    assert.equal(records.length, 1);
    assert.equal((await readProfile(item)).crp_status, responses[0] ? "aprovado" : "rejeitado");
    assert.equal(records[0].raw.previous.crp_status, initial.crp_status);
    assert.equal(records[0].raw.decision, responses[0] ? "approved" : "rejected");
  });
  await check("submitted_cpf_keeps_approval_evidence_and_courtesy_protection", async () => {
    for (const kind of ["approved", "evidence", "courtesy"]) {
      const item = await setup(
        kind === "approved"
          ? { crp_status: "aprovado" }
          : kind === "evidence"
            ? { cfp_verified_at: new Date("2020-01-01T00:00:00Z") }
            : {},
      );
      if (kind === "courtesy") await courtesy(item);
      const before = await snapshot(item);
      await automatic.saveSubmittedCpf({ psychologistId: item.profile.id, cpf: LOCAL_CPF });
      assert.deepEqual(await snapshot(item), before);
    }
  });
  await check("fresh_human_review_can_reverse_manual_rejection", async () => {
    const item = await manualSetup();
    assert.ok(await decide(item, await expectedProfile(item), false));
    const initial = await expectedProfile(item);
    assert.ok(await decide(item, initial, true));
    const records = (await history(item)).filter((record) => record.provider === "manual_admin");
    assert.equal(records.length, 2);
    assert.equal(
      records.find((record) => record.raw.decision === "approved").raw.previous.crp_status,
      "rejeitado",
    );
    assert.equal((await readProfile(item)).crp_status, "aprovado");
    assert.equal((await readProfile(item)).cfp_verified_at, null);
    assert.deepEqual(await readCheck(item.record), item.record);
  });
  await check("expired_courtesy_does_not_block_normal_automatic_confirmation", async () => {
    const item = await setup();
    const grant = await courtesy(item);
    const expired = await prisma.professional_subscription.update({
      where: { id: grant.id },
      data: { current_period_end: new Date("2020-01-01T00:00:00Z") },
    });
    assert.equal((await confirm(item.record, item.results[0])).ok, true);
    await assertConfirmed(item, item.record, item.results[0]);
    assert.deepEqual(
      await prisma.professional_subscription.findUnique({ where: { id: grant.id } }),
      expired,
    );
  });
  for (const kind of ["approved", "evidence", "rejected", "courtesy"]) {
    await check(`free_update_stale_unlocked_option_preserves_${kind}_identity`, async () => {
      const item = await setup(protectedProfileData(kind));
      if (kind === "courtesy") await courtesy(item);
      const before = await snapshot(item);
      // No media exists; true skips the cleanup branch in both image versions.
      assert.equal(before.profile.video_url, null);
      assert.equal(before.profile.video_cover_url, null);
      assert.ok(await editFree(item));
      const after = await snapshot(item);
      assert.deepEqual(identity(after.profile), identity(before.profile));
      assert.equal(after.profile.headline, freeBody().headline);
      assert.deepEqual(after.history, before.history);
    });
  }
  await check("pending_free_profile_remains_editable_without_cleanup", async () => {
    const item = await setup();
    assert.ok(await editFree(item));
    const profile = await readProfile(item);
    assert.equal(profile.cpf, LOCAL_CPF);
    assert.equal(profile.crp, "LOCAL-EDIT/300");
    assert.equal(profile.crp_status, "pendente");
    assert.equal(profile.cfp_verified_at, null);
    assert.deepEqual(await readCheck(item.record), item.record);
  });
  await check("concurrent_free_edit_cannot_replace_automatic_confirmed_identity", async () => {
    const item = await setup();
    const [autoResult, edited] = await concurrentWhileProfileLocked(item.profile.id, [
      () => confirm(item.record, item.results[0]),
      () => editFree(item),
    ]);
    assert.equal(autoResult.ok, true);
    assert.ok(edited);
    await assertConfirmed(item, item.record, item.results[0]);
    assert.equal((await readProfile(item)).headline, freeBody().headline);
  });
  for (const kind of ["approved", "evidence", "rejected", "pending"]) {
    await check(`helper_and_show_report_${kind}_free_identity_lock`, async () => {
      const item = await setup(protectedProfileData(kind));
      const locked = kind !== "pending";
      const before = await snapshot(item);
      const shown = await freeProfile.show(item.user.id);
      assert.ok(shown);
      assert.equal(shown.plan.is_free, true);
      assert.equal(shown.profile.identity_fields_locked, locked);
      assert.equal(
        isProfessionalIdentityLocked({
          cfpVerifiedAt: before.profile.cfp_verified_at,
          cpf: before.profile.cpf,
          crp: before.profile.crp,
          crpStatus: before.profile.crp_status,
          isFree: true,
          source: null,
        }),
        locked,
      );
      assert.deepEqual(await snapshot(item), before);
    });
  }
  await check("failed_confirmation_history_write_rolls_back_profile_and_history", async () => {
    const item = await setup();
    const candidate = await createCheck(item, [resultFor("local-rollback-only")]);
    const before = await snapshot(item);
    const guard = new Client({ connectionString: process.env.DATABASE_URL });
    await guard.connect();
    let installed = false;
    try {
      await guard.query(
        "ALTER TABLE professional_registry_checks ADD CONSTRAINT registry_probe_atomic_rollback CHECK ((raw ->> 'confirmed_result_key') IS DISTINCT FROM 'local-rollback-only')",
      );
      installed = true;
      await assert.rejects(
        () => confirm(candidate.record, candidate.results[0]),
        (error) =>
          error instanceof Error &&
          error.message.includes("registry_probe_atomic_rollback") &&
          error.message.includes("check constraint"),
      );
      assert.deepEqual(await snapshot(item), before);
    } finally {
      try {
        if (installed)
          await guard.query(
            "ALTER TABLE professional_registry_checks DROP CONSTRAINT registry_probe_atomic_rollback",
          );
      } finally {
        await guard.end();
      }
    }
  });
  console.log(
    "PROBE_SUMMARY",
    JSON.stringify({ passed, failed: failures.length, total: passed + failures.length }),
  );
  if (failures.length) process.exitCode = 1;
  else console.log("REGISTRY_POSTGRES_OK");
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
