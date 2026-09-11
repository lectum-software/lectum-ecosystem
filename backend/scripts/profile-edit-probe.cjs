// Only via profile-edit-integration.mjs against its disposable PostgreSQL.
const assert = require("node:assert/strict");
assert.equal(process.env.NODE_ENV, "test");
assert.match(new URL(process.env.DATABASE_URL).hostname, /^lectum-profileedit178-db-[a-f0-9]{20}$/);
const { prisma } = require("/app/dist/external/prisma/client.js");
const {
  AdminPsychologistProfileEditRepository,
} = require("/app/dist/modules/api/admin/private/psychologists/profile-edit/repositories/AdminPsychologistProfileEditRepository.js");
const repository = new AdminPsychologistProfileEditRepository();
let passed = 0;
const failures = [];
const check = async (name, operation) => {
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
(async () => {
  assert.equal(await prisma.user.count(), 0);
  const admin = await prisma.admin.create({
    data: { name: "Auditoria local", email: "audit@example.invalid" },
  });
  let sequence = 0;
  const setup = async () => {
    const user = await prisma.user.create({
      data: {
        name: "Perfil local",
        email: `profile-${sequence++}@example.invalid`,
        role: "psicologo",
      },
    });
    await prisma.psychologist_profile.create({ data: { user_id: user.id, religion: "Anterior" } });
    const profile = await repository.findPsychologist(user.id);
    const { updatedAt } = await prisma.psychologist_profile.findUnique({
      where: { id: profile.id },
    });
    return { ...profile, updatedAt };
  };
  const read = (profile) => prisma.psychologist_profile.findUnique({ where: { id: profile.id } });
  const logs = (profile) =>
    prisma.admin_activity_log.count({ where: { target_id: profile.user_id } });
  const audit = (profile, professional = false) => ({
    action: professional
      ? "psychologist_professional_data_updated"
      : "psychologist_personal_data_updated",
    adminId: admin.id,
    changedFields: [professional ? "Idiomas" : "Religião"],
    metadata: {},
    reason: "Auditoria somente local",
    safeBefore: {},
    safeAfter: {},
    targetId: profile.user_id,
  });
  const personal = (profile, changes, log = audit(profile)) =>
    repository.updatePersonalData(profile.id, {
      expectedUpdatedAt: profile.updatedAt,
      profile: changes,
      audit: log,
    });
  const professional = (profile, changes) =>
    repository.updateProfessionalData(profile, {
      expectedUpdatedAt: profile.updatedAt,
      profile: changes,
      audit: audit(profile, true),
      approachIds: [],
      serviceIds: [],
      specialtyIds: [],
    });

  await check("stale_personal_preserves_saved_value_and_single_log", async () => {
    const profile = await setup();
    await personal(profile, { religion: "Primeira" });
    const result = await personal(profile, { religion: "Segunda" });
    assert.equal((await read(profile)).religion, "Primeira");
    assert.equal(await logs(profile), 1);
    assert.equal(result, false);
  });
  await check("stale_professional_preserves_saved_value_and_single_log", async () => {
    const profile = await setup();
    await professional(profile, { languages: ["Português"] });
    const result = await professional(profile, { languages: ["Espanhol"] });
    assert.deepEqual((await read(profile)).languages, ["Português"]);
    assert.equal(await logs(profile), 1);
    assert.equal(result, false);
  });
  await check("concurrent_same_snapshot_has_one_winner_and_one_log", async () => {
    const profile = await setup();
    const results = await Promise.all([
      personal(profile, { religion: "Primeira" }),
      personal(profile, { religion: "Segunda" }),
    ]);
    assert.equal(await logs(profile), 1);
    assert.deepEqual(results.sort(), [false, true]);
  });
  await check("failed_audit_rolls_back_profile", async () => {
    const profile = await setup();
    let rejected = false;
    try {
      await personal(
        profile,
        { religion: "Não deve persistir" },
        { ...audit(profile), adminId: "missing-local-admin" },
      );
    } catch (error) {
      assert.equal(error.code, "P2003");
      rejected = true;
    }
    assert.equal(rejected, true);
    assert.equal((await read(profile)).religion, "Anterior");
    assert.equal(await logs(profile), 0);
  });
  await check("inactive_user_is_not_modified_or_logged", async () => {
    const profile = await setup();
    await prisma.user.update({ where: { id: profile.user_id }, data: { active: false } });
    const result = await personal(profile, { religion: "Não deve persistir" });
    assert.equal((await read(profile)).religion, "Anterior");
    assert.equal(await logs(profile), 0);
    assert.equal(result, false);
  });
  await check("deleted_profile_is_not_modified_or_logged", async () => {
    const profile = await setup();
    await prisma.psychologist_profile.update({
      where: { id: profile.id },
      data: { deleted: true },
    });
    const result = await professional(profile, { languages: ["Português"] });
    assert.equal((await read(profile)).languages, null);
    assert.equal(await logs(profile), 0);
    assert.equal(result, false);
  });
  await check("fresh_write_preserves_other_profile_and_null_clear", async () => {
    const profile = await setup();
    const other = await setup();
    await personal(profile, { religion: null });
    assert.equal((await read(profile)).religion, null);
    assert.equal((await read(other)).religion, "Anterior");
    assert.equal(await logs(profile), 1);
    assert.equal(await logs(other), 0);
  });
  await check("same_snapshot_cannot_write_twice_without_audit", async () => {
    const profile = await setup();
    await personal(profile, { gender: "Primeira" }, null);
    const result = await personal(profile, { gender: "Segunda" }, null);
    assert.equal((await read(profile)).gender, "Primeira");
    assert.equal(await logs(profile), 0);
    assert.equal(result, false);
  });
  const relationSetup = async () => {
    const profile = await setup();
    for (const kind of ["specialty", "service", "approach"]) {
      const item = await prisma[kind].create({
        data: { name: `Item ${sequence++}`, slug: `item-${sequence++}` },
      });
      await prisma[`psychologist_${kind}`].create({
        data: { psychologist_id: profile.user_id, [`${kind}_id`]: item.id },
      });
    }
    return profile;
  };
  const relationCounts = async (profile) =>
    Promise.all(
      ["specialty", "service", "approach"].map((kind) =>
        prisma[`psychologist_${kind}`].count({
          where: { psychologist_id: profile.user_id, deleted: false },
        }),
      ),
    );
  await check("omitted_relations_are_not_reapplied", async () => {
    const profile = await relationSetup();
    const saved = await repository.updateProfessionalData(profile, {
      expectedUpdatedAt: profile.updatedAt,
      profile: { modality: "online" },
      audit: audit(profile, true),
    });
    assert.equal(saved, true);
    assert.deepEqual(await relationCounts(profile), [1, 1, 1]);
    assert.equal((await read(profile)).modality, "online");
  });
  await check("explicit_empty_relations_are_cleared", async () => {
    const profile = await relationSetup();
    await professional(profile, {});
    assert.deepEqual(await relationCounts(profile), [0, 0, 0]);
    assert.equal(await logs(profile), 1);
  });
  await check("stale_relation_clear_does_not_delete_or_log", async () => {
    const profile = await relationSetup();
    await personal(profile, { religion: "Primeira" });
    const saved = await professional(profile, {});
    assert.equal(saved, false);
    assert.deepEqual(await relationCounts(profile), [1, 1, 1]);
    assert.equal(await logs(profile), 1);
  });
  console.log(
    "PROBE_SUMMARY",
    JSON.stringify({ passed, failed: failures.length, total: passed + failures.length }),
  );
  if (failures.length) process.exitCode = 1;
  else console.log("PROFILE_EDIT_POSTGRES_OK");
})()
  .catch(() => {
    console.error("INTEGRATION_FAILED");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
