// Only through isolated-postgres-runner.mjs. Real repositories/services, Prisma, PostgreSQL
// constraints and triggers from the immutable image; no HTTP/Prisma/provider replacements.
const assert = require("node:assert/strict");

// Fail closed BEFORE importing any application code or opening any connection.
assert.deepEqual(Object.keys(process.env).sort(), [
  "ADMIN_JWT_SECRET",
  "CRYPTO_ALGORITHM",
  "DATABASE_URL",
  "JWT_SECRET_KEY",
  "NODE_ENV",
  "PATH",
]);
assert.equal(process.env.NODE_ENV, "test");
assert.equal(process.env.PATH, "/usr/local/bin:/usr/bin:/bin");
assert.equal(process.env.CRYPTO_ALGORITHM, "bcrypt");
assert.match(process.env.JWT_SECRET_KEY, /^[a-f0-9]{64}$/);
assert.match(process.env.ADMIN_JWT_SECRET, /^[a-f0-9]{64}$/);
const databaseUrl = new URL(process.env.DATABASE_URL);
assert.equal(databaseUrl.protocol, "postgresql:");
assert.match(databaseUrl.hostname, /^lectum-legal-governance178-db-[a-f0-9]{20}$/);
assert.equal(databaseUrl.pathname, "/lectum_audit");
assert.equal(databaseUrl.username, "lectum_audit");
assert.equal(databaseUrl.port, "5432");
assert.equal(databaseUrl.search, "");
assert.equal(databaseUrl.hash, "");
assert.match(databaseUrl.password, /^[a-f0-9]{48}$/);

const { randomUUID } = require("node:crypto");
const { setTimeout: delay } = require("node:timers/promises");
const { Client } = require("/app/node_modules/pg");
const { prisma } = require("/app/dist/external/prisma/client.js");
const {
  documentHash,
  normalizeDraft,
  LegalError,
} = require("/app/dist/modules/legal/contracts.js");
const {
  LegalReadRepository,
} = require("/app/dist/modules/legal/repositories/LegalReadRepository.js");
const {
  LegalWriteRepository,
} = require("/app/dist/modules/legal/repositories/LegalWriteRepository.js");
const privateServices = require("/app/dist/modules/api/private/legal/use-cases/services.js");
const adminServices = require("/app/dist/modules/api/admin/private/settings/legal/use-cases/services.js");
const publicServices = require("/app/dist/modules/api/public/legal/use-cases/services.js");
const { assertAdultRegistration } = require("/app/dist/modules/legal/registration.js");
const read = new LegalReadRepository();
const write = new LegalWriteRepository();
const monitor = new Client({ connectionString: process.env.DATABASE_URL });
const cases = [];
const test = (name, run) => cases.push({ name, run });
let admin;
let otherAdmin;
let alice;
let bob;
let terms;
let privacy;
let httpServer;
let httpOrigin;
let httpUser;
let httpAdmin;
let sequence = 0;
let passed = 0;
let stage = "setup";
const failures = [];

// Ephemeral fixture text is deliberately NOT a real legal document or approval.
const draftValue = (extra = {}) => ({
  title: `Documento efêmero ${++sequence}`,
  body: "Texto exclusivo para testar regras de persistência em banco descartável. ".repeat(24),
  change_summary: "Alteração exclusiva para ensaio isolado.",
  ...extra,
});
const newDraft = (kind = "terms", extra = {}, author = admin) =>
  write.create(author.id, { kind, ...draftValue(extra) });
const newPublished = async (kind = "terms") => {
  const doc = await newDraft(kind);
  return write.publish(admin.id, doc.id, doc.revision, true);
};
const newUser = () =>
  prisma.user.create({
    data: {
      name: `Pessoa efêmera ${++sequence}`,
      email: `legal-${sequence}@example.invalid`,
      role: "paciente",
    },
  });
const stored = (id) => prisma.legal_document_version.findUniqueOrThrow({ where: { id } });
const evidence = (userId) =>
  prisma.legal_acceptance.findMany({
    where: { user_id: userId },
    orderBy: { document_id: "asc" },
  });
const logs = (id) =>
  prisma.admin_activity_log.findMany({
    where: { target_type: "legal_document", target_id: id, domain: "legal" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
const idsOf = (documents) => documents.map((doc) => doc.id).sort();
const acceptInput = (documents, extra = {}) => ({
  document_ids: idsOf(documents),
  terms_accepted: true,
  privacy_acknowledged: true,
  adult_confirmed: true,
  ...extra,
});
const expectLegal = (operation, code, status = 409) =>
  assert.rejects(operation, (error) => {
    // Unexpected database/runtime errors must not masquerade as expected domain rejections.
    if (!(error instanceof LegalError)) throw error;
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    assert.equal(error.message, code);
    return true;
  });
const expectSql = (operation, code = "P0001") =>
  assert.rejects(operation, (error) => {
    assert.equal(error.code, code);
    return true;
  });
const consistentStatus = (status) => {
  assert.equal(status.configured, true);
  assert.equal(status.documents.length, 2);
  assert.deepEqual(status.documents.map((doc) => doc.kind).sort(), ["privacy", "terms"]);
  const ids = idsOf(status.documents);
  assert.equal(new Set(ids).size, 2);
  assert.ok(status.acceptances.every((row) => ids.includes(row.document_id)));
  for (const row of status.acceptances) {
    assert.deepEqual(Object.keys(row).sort(), ["accepted_at", "document_id"]);
    assert.equal(new Date(row.accepted_at).toISOString(), row.accepted_at);
  }
  assert.deepEqual(
    [...status.pending_document_ids].sort(),
    ids.filter((id) => !status.acceptances.some((row) => row.document_id === id)),
  );
};
const onlyConflictLoser = (results, code = "legal_conflict") => {
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const losers = results.filter((result) => result.status === "rejected");
  assert.equal(losers.length, 1);
  assert.ok(losers[0].reason instanceof LegalError);
  assert.equal(losers[0].reason.code, code);
  assert.equal(losers[0].reason.status, 409);
};

// Native lock barriers observed in pg_stat_activity, not timing assumptions or monkey-patches.
const waitForBlocked = async (pattern, minimum) => {
  const deadline = Date.now() + 2500;
  while (Date.now() < deadline) {
    const result = await monitor.query(
      `SELECT count(*)::int AS count FROM pg_stat_activity
       WHERE datname = current_database() AND pid <> pg_backend_pid()
       AND wait_event_type = 'Lock' AND query LIKE $1`,
      [pattern],
    );
    if (result.rows[0].count >= minimum) return;
    await delay(10);
  }
  // Barrier/runtime failure is NEVER a skipped case or a passing race.
  throw new Error("BarrierNotReached");
};
const orderedAtLock = async (sql, params, operations, pattern) => {
  const blocker = new Client({ connectionString: process.env.DATABASE_URL });
  const pending = [];
  await blocker.connect();
  try {
    await blocker.query("BEGIN");
    await blocker.query(sql, params);
    try {
      for (const operation of operations) {
        pending.push(
          operation().then(
            (value) => ({ status: "fulfilled", value }),
            (reason) => ({ status: "rejected", reason }),
          ),
        );
        await waitForBlocked(pattern, pending.length);
      }
    } finally {
      await blocker.query("COMMIT");
      await Promise.all(pending);
    }
    return await Promise.all(pending);
  } finally {
    await blocker.query("ROLLBACK");
    await blocker.end();
  }
};
const atKindLock = (kind, operations) =>
  orderedAtLock(
    "SELECT pg_advisory_xact_lock(178369, $1::int)",
    [kind === "terms" ? 1 : 2],
    operations,
    "%pg_advisory_xact_lock%",
  );
const atDocumentLock = (doc, operations) =>
  orderedAtLock(
    "SELECT id FROM legal_document_versions WHERE id=$1 FOR UPDATE",
    [doc.id],
    operations,
    '%UPDATE%"legal_document_versions"%',
  );

for (const value of [true, false, undefined]) {
  test(`registration_before_bundle_adult_${String(value)}`, async () => {
    const beforeUsers = await prisma.user.count();
    const beforeAcceptances = await prisma.legal_acceptance.count();
    for (const operation of [
      () => assertAdultRegistration(value),
      () => prisma.$transaction((tx) => assertAdultRegistration(value, tx)),
    ]) {
      if (value === false) await expectLegal(operation, "adult_declaration_required", 422);
      else assert.equal(await operation(), undefined);
    }
    assert.equal(await prisma.user.count(), beforeUsers);
    assert.equal(await prisma.legal_acceptance.count(), beforeAcceptances);
  });
}

test("empty_database_is_unconfigured_without_acceptance_side_effects", async () => {
  assert.deepEqual(await publicServices.current(), { configured: false, documents: [] });
  assert.deepEqual(await read.status(alice.id), {
    configured: false,
    documents: [],
    pending_document_ids: [],
    acceptances: [],
  });
  assert.deepEqual(await read.list(1), {
    items: [],
    total: 0,
    page: 1,
    limit: 20,
    configured: false,
  });
  await expectLegal(() => write.accept(alice.id, acceptInput([])), "legal_documents_changed");
  assert.equal(await prisma.legal_acceptance.count(), 0);
});

test("draft_creation_normalizes_hash_and_records_real_admin", async () => {
  const input = draftValue({
    title: "  Termos efêmeros  ",
    body: ` \r\n${draftValue().body}\r\nFinal\rFim  `,
  });
  terms = await write.create(admin.id, { kind: "terms", ...input });
  const doc = await stored(terms.id);
  assert.equal(doc.status, "draft");
  assert.equal(doc.version, 1);
  assert.equal(doc.revision, 1);
  for (const [key, value] of Object.entries(normalizeDraft(input))) assert.equal(doc[key], value);
  assert.equal(doc.content_hash, documentHash(input));
  assert.equal(doc.created_by_admin_id, admin.id);
  assert.equal(doc.updated_by_admin_id, admin.id);
  assert.equal(doc.published_by_admin_id, null);
  assert.equal(doc.published_at, null);
});

test("draft_is_not_public_even_by_exact_id", async () => {
  assert.deepEqual(await read.current(), { configured: false, documents: [] });
  await expectLegal(() => publicServices.detail(terms.id), "legal_not_found", 404);
  assert.equal((await read.detail(terms.id)).body, terms.body);
  assert.equal((await read.list(1)).configured, false);
});

for (const target of ["publicDetail", "detail", "acceptances"]) {
  test(`missing_${target}_is_404`, () =>
    expectLegal(() => read[target]("missing-isolated-document", 1), "legal_not_found", 404));
}
test("missing_duplicate_and_publish_are_404", async () => {
  await expectLegal(
    () => write.duplicate(admin.id, "missing-isolated-document"),
    "legal_not_found",
    404,
  );
  await expectLegal(
    () => write.publish(admin.id, "missing-isolated-document", 1, true),
    "legal_not_found",
    404,
  );
});

test("review_false_cannot_publish_or_write_audit", async () => {
  const before = await stored(terms.id);
  const beforeLogs = await logs(terms.id);
  for (const reviewed of [false, undefined, "true", 1]) {
    await expectLegal(
      () => write.publish(admin.id, terms.id, terms.revision, reviewed),
      "legal_review_required",
      422,
    );
  }
  assert.deepEqual(await stored(terms.id), before);
  assert.deepEqual(await logs(terms.id), beforeLogs);
});

for (const field of ["title", "body", "change_summary"]) {
  test(`placeholder_${field}_blocks_publication_atomically`, async () => {
    const value = draftValue();
    const doc = await newDraft("terms", {
      ...value,
      [field]: `${value[field]} [ENDERECO_EMPRESARIAL]`,
    });
    const before = await stored(doc.id);
    const beforeLogs = await logs(doc.id);
    await expectLegal(
      () => write.publish(admin.id, doc.id, doc.revision, true),
      "legal_incomplete",
      422,
    );
    assert.deepEqual(await stored(doc.id), before);
    assert.deepEqual(await logs(doc.id), beforeLogs);
    await expectLegal(() => read.publicDetail(doc.id), "legal_not_found", 404);
  });
}
for (const header of ["Minuta", "Rascunho"]) {
  test(`draft_header_${header.toLowerCase()}_blocks_publication`, async () => {
    const doc = await newDraft("terms", { body: `${draftValue().body}\n## ${header}\nTexto.` });
    await expectLegal(
      () => write.publish(admin.id, doc.id, doc.revision, true),
      "legal_incomplete",
      422,
    );
    assert.equal((await stored(doc.id)).status, "draft");
  });
}
test("short_document_blocks_publication", async () => {
  const doc = await newDraft("terms", { body: "B".repeat(999) });
  await expectLegal(
    () => write.publish(admin.id, doc.id, doc.revision, true),
    "legal_incomplete",
    422,
  );
});

test("one_published_kind_is_still_unconfigured", async () => {
  terms = await write.publish(admin.id, terms.id, terms.revision, true);
  const current = await read.current();
  assert.equal(current.configured, false);
  assert.deepEqual(idsOf(current.documents), [terms.id]);
  assert.equal((await read.list(1)).configured, false);
  const status = await read.status(alice.id);
  assert.equal(status.configured, false);
  assert.deepEqual(status.pending_document_ids, []);
  await expectLegal(
    () => write.accept(alice.id, acceptInput(current.documents)),
    "legal_documents_changed",
  );
  assert.deepEqual(await evidence(alice.id), []);
});

test("registration_undefined_remains_compatible_with_only_one_published_kind", async () => {
  const before = await prisma.legal_acceptance.count();
  assert.equal(await assertAdultRegistration(undefined), undefined);
  assert.equal(await prisma.legal_acceptance.count(), before);
});

test("two_draft_kinds_do_not_complete_published_bundle", async () => {
  privacy = await newDraft("privacy");
  assert.equal(privacy.version, 1);
  assert.equal((await read.current()).configured, false);
  await expectLegal(
    () => write.accept(alice.id, acceptInput([terms, privacy])),
    "legal_documents_changed",
  );
  assert.deepEqual(await evidence(alice.id), []);
});

test("two_published_kinds_configure_without_implicit_acceptance", async () => {
  privacy = await write.publish(admin.id, privacy.id, privacy.revision, true);
  const current = await publicServices.current();
  assert.equal(current.configured, true);
  assert.deepEqual(idsOf(current.documents), idsOf([terms, privacy]));
  assert.equal((await read.list(1)).configured, true);
  const status = await read.status(alice.id);
  consistentStatus(status);
  assert.deepEqual(status.acceptances, []);
  assert.deepEqual([...status.pending_document_ids].sort(), idsOf([terms, privacy]));
  assert.equal(await prisma.legal_acceptance.count(), 0);
});

for (const value of [true, false, undefined]) {
  test(`registration_after_bundle_adult_${String(value)}`, async () => {
    const beforeUsers = await prisma.user.count();
    const beforeAcceptances = await prisma.legal_acceptance.count();
    for (const operation of [
      () => assertAdultRegistration(value),
      () => prisma.$transaction((tx) => assertAdultRegistration(value, tx)),
    ]) {
      if (value !== true) await expectLegal(operation, "adult_declaration_required", 422);
      else assert.equal(await operation(), undefined);
    }
    assert.equal(await prisma.user.count(), beforeUsers);
    assert.equal(await prisma.legal_acceptance.count(), beforeAcceptances);
  });
}

test("public_document_projection_excludes_admin_and_internal_status_ids", async () => {
  const doc = await publicServices.detail(terms.id);
  assert.deepEqual(Object.keys(doc).sort(), [
    "body",
    "change_summary",
    "content_hash",
    "id",
    "kind",
    "published_at",
    "title",
    "version",
  ]);
  assert.equal(doc.content_hash, documentHash(await stored(terms.id)));
  assert.equal(new Date(doc.published_at).toISOString(), doc.published_at);
});

test("edit_CAS_increments_revision_and_preserves_identity", async () => {
  const doc = await newDraft();
  const value = draftValue({ body: `${draftValue().body}\r\nAtualização` });
  const edited = await write.edit(otherAdmin.id, doc.id, { ...value, revision: doc.revision });
  const after = await stored(doc.id);
  assert.equal(edited.revision, doc.revision + 1);
  assert.equal(after.kind, doc.kind);
  assert.equal(after.version, doc.version);
  assert.equal(after.created_by_admin_id, admin.id);
  assert.equal(after.updated_by_admin_id, otherAdmin.id);
  assert.equal(after.content_hash, documentHash(value));
  assert.equal(after.body, normalizeDraft(value).body);
  const beforeLogs = await logs(doc.id);
  await expectLegal(
    () => write.edit(admin.id, doc.id, { ...draftValue(), revision: doc.revision }),
    "legal_conflict",
  );
  await expectLegal(() => write.publish(admin.id, doc.id, doc.revision, true), "legal_conflict");
  assert.deepEqual(await stored(doc.id), after);
  assert.deepEqual(await logs(doc.id), beforeLogs);
});

test("published_edit_and_republish_conflict_without_side_effects", async () => {
  const before = await stored(terms.id);
  const beforeLogs = await logs(terms.id);
  await expectLegal(
    () => write.edit(admin.id, terms.id, { ...draftValue(), revision: terms.revision }),
    "legal_conflict",
  );
  await expectLegal(
    () => write.publish(admin.id, terms.id, terms.revision, true),
    "legal_conflict",
  );
  assert.deepEqual(await stored(terms.id), before);
  assert.deepEqual(await logs(terms.id), beforeLogs);
});

for (const sourceState of ["draft", "published"]) {
  test(`duplicate_${sourceState}_creates_new_draft_with_same_content_not_acceptances`, async () => {
    const source = sourceState === "draft" ? await newDraft() : terms;
    const before = await stored(source.id);
    const last = await prisma.legal_document_version.aggregate({
      where: { kind: source.kind },
      _max: { version: true },
    });
    const copy = await write.duplicate(otherAdmin.id, source.id);
    const row = await stored(copy.id);
    assert.notEqual(row.id, source.id);
    assert.equal(row.kind, source.kind);
    assert.equal(row.version, last._max.version + 1);
    assert.equal(row.revision, 1);
    assert.equal(row.status, "draft");
    for (const field of ["title", "body", "change_summary", "content_hash"])
      assert.equal(row[field], before[field]);
    assert.equal(row.created_by_admin_id, otherAdmin.id);
    assert.equal(row.updated_by_admin_id, otherAdmin.id);
    assert.equal(row.published_at, null);
    assert.equal(row.published_by_admin_id, null);
    assert.equal(copy.acceptance_count, 0);
    await expectLegal(() => read.publicDetail(copy.id), "legal_not_found", 404);
    assert.deepEqual(await stored(source.id), before);
  });
}

for (const field of ["adult_confirmed", "terms_accepted", "privacy_acknowledged"]) {
  test(`accept_requires_literal_true_${field}_and_is_atomic`, async () => {
    for (const invalid of [false, undefined, "true", 1]) {
      await expectLegal(
        () => write.accept(alice.id, acceptInput([terms, privacy], { [field]: invalid })),
        field === "adult_confirmed" ? "adult_declaration_required" : "legal_acceptance_required",
        422,
      );
    }
    assert.deepEqual(await evidence(alice.id), []);
  });
}
for (const variant of ["empty", "one", "duplicate", "extra", "unknown", "draft"]) {
  test(`accept_rejects_${variant}_document_set_without_partial_rows`, async () => {
    const draft = await newDraft();
    const ids = {
      empty: [],
      one: [terms.id],
      duplicate: [terms.id, terms.id],
      extra: [terms.id, privacy.id, draft.id],
      unknown: [terms.id, "not-a-current-document"],
      draft: [draft.id, privacy.id],
    }[variant];
    await expectLegal(
      () => write.accept(alice.id, acceptInput([], { document_ids: ids })),
      "legal_documents_changed",
    );
    assert.deepEqual(await evidence(alice.id), []);
  });
}

test("accept_persists_exact_current_ids_hashes_actions_and_server_timestamp", async () => {
  const started = Date.now();
  const result = await write.accept(alice.id, acceptInput([privacy, terms]));
  const finished = Date.now();
  consistentStatus(result);
  assert.deepEqual(result.pending_document_ids, []);
  const rows = await evidence(alice.id);
  assert.equal(rows.length, 2);
  for (const row of rows) {
    const doc = await stored(row.document_id);
    assert.equal(row.user_id, alice.id);
    assert.equal(row.document_hash, documentHash(doc));
    assert.equal(row.action, doc.kind === "terms" ? "terms_accept" : "privacy_acknowledge");
    assert.equal(row.adult_confirmed, true);
    assert.ok(row.accepted_at.getTime() >= started && row.accepted_at.getTime() <= finished);
  }
});

test("accept_retry_preserves_first_timestamp_primary_ids_and_count", async () => {
  const before = await evidence(alice.id);
  // Explicitly prove the server clock moved before retry, rather than relying on equal-ms luck.
  await monitor.query("SELECT pg_sleep(0.02)");
  await write.accept(alice.id, acceptInput([terms, privacy]));
  assert.deepEqual(await evidence(alice.id), before);
  assert.equal((await read.detail(terms.id)).acceptance_count, 1);
  assert.equal((await read.detail(privacy.id)).acceptance_count, 1);
});

test("private_status_does_not_include_another_user_evidence_or_honor_supplied_ids", async () => {
  const result = await privateServices.status({
    auth: { id: bob.id },
    b: { user_id: alice.id, document_ids: [terms.id] },
    p: { user_id: alice.id },
    q: { user_id: alice.id, document_ids: [terms.id] },
  });
  consistentStatus(result);
  assert.deepEqual(result.acceptances, []);
  assert.deepEqual([...result.pending_document_ids].sort(), idsOf([terms, privacy]));
  assert.deepEqual(await evidence(bob.id), []);
});

test("private_accept_uses_authenticated_actor_and_ignores_forged_evidence_fields", async () => {
  const before = await evidence(alice.id);
  await privateServices.accept({
    auth: { id: bob.id },
    b: {
      ...acceptInput([terms, privacy]),
      user_id: alice.id,
      document_hash: "forged",
      action: "marketing_consent",
      accepted_at: "2000-01-01T00:00:00.000Z",
    },
  });
  assert.deepEqual(await evidence(alice.id), before);
  const rows = await evidence(bob.id);
  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.equal(row.user_id, bob.id);
    assert.equal(row.document_hash, documentHash(await stored(row.document_id)));
    assert.ok(["terms_accept", "privacy_acknowledge"].includes(row.action));
    assert.notEqual(row.accepted_at.toISOString(), "2000-01-01T00:00:00.000Z");
  }
});

test("duplicate_of_accepted_publication_does_not_copy_acceptances", async () => {
  const before = await evidence(alice.id);
  const copy = await write.duplicate(admin.id, terms.id);
  assert.equal(copy.acceptance_count, 0);
  assert.deepEqual((await read.acceptances(copy.id, 1)).items, []);
  assert.deepEqual(await evidence(alice.id), before);
});

test("audit_is_allowlisted_metadata_without_document_body_or_personal_fields", async () => {
  const privateMarker = "private-test-marker@example.invalid";
  const doc = await newDraft("privacy", {
    title: `Documento ${privateMarker}`,
    body: `${draftValue().body}\n${privateMarker}`,
    change_summary: `Resumo ${privateMarker}`,
  });
  const edited = await write.edit(otherAdmin.id, doc.id, {
    ...draftValue({ body: `${draftValue().body}\n${privateMarker}` }),
    revision: doc.revision,
  });
  await write.publish(otherAdmin.id, doc.id, edited.revision, true);
  const events = await logs(doc.id);
  assert.equal(events.length, 3);
  assert.deepEqual(events.map((e) => e.action).sort(), [
    "document_published",
    "draft_created",
    "draft_updated",
  ]);
  for (const event of events) {
    assert.equal(event.target_type, "legal_document");
    assert.equal(event.domain, "legal");
    assert.equal(event.area, "settings");
    assert.equal(event.source, "admin_panel");
    assert.equal(event.admin_id, event.action === "draft_created" ? admin.id : otherAdmin.id);
    assert.deepEqual(Object.keys(event.metadata).sort(), ["content_hash", "version"]);
    assert.equal(event.metadata.version, doc.version);
    assert.equal(
      event.metadata.content_hash,
      event.action === "draft_created" ? doc.content_hash : edited.content_hash,
    );
    for (const field of ["changed_fields", "safe_before", "safe_after", "reason"])
      assert.equal(event[field], null);
    assert.equal(JSON.stringify(event).includes(privateMarker), false);
    assert.equal(JSON.stringify(event).includes(alice.email), false);
  }
});

test("new_publication_makes_only_changed_kind_pending_and_rejects_old_ids_409", async () => {
  const current = await read.current();
  await write.accept(alice.id, acceptInput(current.documents));
  const before = await evidence(alice.id);
  const previousTerms = current.documents.find((doc) => doc.kind === "terms");
  const next = await newPublished("terms");
  assert.ok(next.version > previousTerms.version);
  await expectLegal(
    () => write.accept(alice.id, acceptInput(current.documents)),
    "legal_documents_changed",
  );
  assert.deepEqual(await evidence(alice.id), before);
  assert.equal((await read.publicDetail(previousTerms.id)).id, previousTerms.id);
  const status = await read.status(alice.id);
  consistentStatus(status);
  assert.deepEqual(status.pending_document_ids, [next.id]);
  assert.ok(!status.acceptances.some((row) => row.document_id === previousTerms.id));
  const evidenceIds = before.map((row) => row.document_id);
  assert.deepEqual(
    [...status.pending_document_ids].sort(),
    idsOf(status.documents).filter((id) => !evidenceIds.includes(id)),
  );
  await write.accept(alice.id, acceptInput(status.documents));
  for (const row of before)
    assert.deepEqual(
      (await evidence(alice.id)).find((e) => e.id === row.id),
      row,
    );
});

test("older_unpublished_version_cannot_roll_back_current_version", async () => {
  const older = await newDraft("terms");
  const newer = await newPublished("terms");
  const beforeLogs = await logs(older.id);
  await expectLegal(
    () => write.publish(admin.id, older.id, older.revision, true),
    "legal_conflict",
  );
  assert.equal((await stored(older.id)).status, "draft");
  assert.deepEqual(await logs(older.id), beforeLogs);
  assert.equal((await read.current()).documents.find((doc) => doc.kind === "terms").id, newer.id);
});

for (const kind of ["terms", "privacy"]) {
  test(`concurrent_${kind}_draft_creation_allocates_distinct_monotonic_versions`, async () => {
    const last = await prisma.legal_document_version.aggregate({
      where: { kind },
      _max: { version: true },
    });
    const results = await atKindLock(
      kind,
      Array.from({ length: 4 }, () => () => newDraft(kind)),
    );
    assert.ok(results.every((result) => result.status === "fulfilled"));
    assert.deepEqual(
      results.map((result) => result.value.version).sort((a, b) => a - b),
      [1, 2, 3, 4].map((n) => last._max.version + n),
    );
    assert.equal(new Set(results.map((result) => result.value.id)).size, 4);
    for (const result of results) assert.equal((await logs(result.value.id)).length, 1);
  });
}

test("concurrent_edits_same_revision_have_one_CAS_winner", async () => {
  const doc = await newDraft();
  const a = draftValue();
  const b = draftValue();
  const results = await atDocumentLock(doc, [
    () => write.edit(admin.id, doc.id, { ...a, revision: doc.revision }),
    () => write.edit(otherAdmin.id, doc.id, { ...b, revision: doc.revision }),
  ]);
  onlyConflictLoser(results);
  const row = await stored(doc.id);
  assert.equal(row.revision, doc.revision + 1);
  assert.equal(row.content_hash, documentHash(results[0].status === "fulfilled" ? a : b));
  assert.equal((await logs(doc.id)).filter((event) => event.action === "draft_updated").length, 1);
});

for (const first of ["edit", "publish"]) {
  test(`concurrent_${first}_first_edit_vs_publish_has_one_CAS_winner`, async () => {
    const doc = await newDraft();
    const value = draftValue();
    const edit = () => write.edit(otherAdmin.id, doc.id, { ...value, revision: doc.revision });
    const publish = () => write.publish(admin.id, doc.id, doc.revision, true);
    const results = await atDocumentLock(doc, first === "edit" ? [edit, publish] : [publish, edit]);
    onlyConflictLoser(results);
    assert.equal(results[0].status, "fulfilled");
    const row = await stored(doc.id);
    assert.equal(row.status, first === "edit" ? "draft" : "published");
    assert.equal(row.content_hash, first === "edit" ? documentHash(value) : doc.content_hash);
    assert.equal(row.revision, doc.revision + 1);
    assert.equal((await logs(doc.id)).length, 2);
    if (first === "edit")
      await expectLegal(() => read.publicDetail(doc.id), "legal_not_found", 404);
    else assert.equal((await read.publicDetail(doc.id)).content_hash, doc.content_hash);
  });
}

test("concurrent_publications_same_draft_have_one_winner_and_one_audit", async () => {
  const doc = await newDraft();
  const results = await atKindLock("terms", [
    () => write.publish(admin.id, doc.id, doc.revision, true),
    () => write.publish(otherAdmin.id, doc.id, doc.revision, true),
  ]);
  onlyConflictLoser(results);
  assert.equal((await stored(doc.id)).revision, doc.revision + 1);
  assert.equal(
    (await logs(doc.id)).filter((event) => event.action === "document_published").length,
    1,
  );
});

test("concurrent_duplicate_and_create_share_monotonic_allocator", async () => {
  const last = await prisma.legal_document_version.aggregate({
    where: { kind: "terms" },
    _max: { version: true },
  });
  const results = await atKindLock("terms", [
    () => write.duplicate(admin.id, terms.id),
    () => newDraft(),
  ]);
  assert.ok(results.every((result) => result.status === "fulfilled"));
  assert.deepEqual(
    results.map((result) => result.value.version).sort((a, b) => a - b),
    [last._max.version + 1, last._max.version + 2],
  );
});

test("concurrent_accept_retries_produce_exactly_one_evidence_per_document", async () => {
  const user = await newUser();
  const current = await read.current();
  const results = await atKindLock(
    "terms",
    Array.from({ length: 4 }, () => () => write.accept(user.id, acceptInput(current.documents))),
  );
  assert.ok(results.every((result) => result.status === "fulfilled"));
  const rows = await evidence(user.id);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.document_id).sort(), idsOf(current.documents));
  for (const result of results) {
    consistentStatus(result.value);
    assert.deepEqual(result.value.pending_document_ids, []);
    for (const item of result.value.acceptances) {
      assert.equal(
        item.accepted_at,
        rows.find((row) => row.document_id === item.document_id).accepted_at.toISOString(),
      );
    }
  }
});

for (const kind of ["terms", "privacy"]) {
  for (const first of ["publish", "accept"]) {
    test(`concurrent_${kind}_${first}_first_publication_vs_acceptance_is_coherent`, async () => {
      const user = await newUser();
      const current = await read.current();
      const next = await newDraft(kind);
      const publish = () => write.publish(admin.id, next.id, next.revision, true);
      const accept = () => write.accept(user.id, acceptInput(current.documents));
      const results = await atKindLock(
        kind,
        first === "publish" ? [publish, accept] : [accept, publish],
      );
      if (first === "publish") {
        onlyConflictLoser(results, "legal_documents_changed");
        assert.equal(results[0].status, "fulfilled");
        assert.deepEqual(await evidence(user.id), []);
      } else {
        assert.ok(results.every((result) => result.status === "fulfilled"));
        consistentStatus(results[0].value);
        const rows = await evidence(user.id);
        assert.deepEqual(rows.map((row) => row.document_id).sort(), idsOf(current.documents));
        for (const row of rows)
          assert.equal(row.document_hash, documentHash(await stored(row.document_id)));
      }
      const final = await read.status(user.id);
      consistentStatus(final);
      assert.equal(final.documents.find((doc) => doc.kind === kind).id, next.id);
      assert.ok(final.pending_document_ids.includes(next.id));
      assert.deepEqual(
        final.pending_document_ids.slice().sort(),
        first === "publish" ? idsOf(final.documents) : [next.id],
      );
      assert.ok(!final.acceptances.some((row) => row.document_id === next.id));
    });
  }
}

const immutableUpdates = {
  body: "body = body || ' alteração'",
  title: "title = title || ' alteração'",
  change_summary: "change_summary = change_summary || ' alteração'",
  hash: "content_hash = 'forged'",
  status: "status = 'draft', published_at = NULL, published_by_admin_id = NULL",
  kind: "kind = 'privacy'",
  version: "version = version + 100000",
  revision: "revision = revision + 1",
  publication_date: "published_at = published_at + interval '1 day'",
  author: "updated_by_admin_id = 'forged-admin'",
  no_op: "body = body",
};
for (const [name, update] of Object.entries(immutableUpdates)) {
  test(`sql_published_${name}_is_immutable`, async () => {
    const before = await stored(terms.id);
    await expectSql(() =>
      monitor.query(`UPDATE legal_document_versions SET ${update} WHERE id=$1`, [terms.id]),
    );
    assert.deepEqual(await stored(terms.id), before);
  });
}
test("sql_published_delete_is_rejected", async () => {
  const before = await stored(terms.id);
  await expectSql(() =>
    monitor.query("DELETE FROM legal_document_versions WHERE id=$1", [terms.id]),
  );
  assert.deepEqual(await stored(terms.id), before);
});

for (const field of ["id", "kind", "version"]) {
  test(`sql_draft_${field}_identity_is_immutable`, async () => {
    const doc = await newDraft();
    const before = await stored(doc.id);
    const update = {
      id: "id = id || '-forged'",
      kind: "kind = 'privacy'",
      version: "version = version + 100000",
    }[field];
    await expectSql(() =>
      monitor.query(`UPDATE legal_document_versions SET ${update} WHERE id=$1`, [doc.id]),
    );
    assert.deepEqual(await stored(doc.id), before);
  });
}

const insertEvidence = (user, doc, extra = {}) => {
  const value = {
    hash: doc.content_hash,
    action: doc.kind === "terms" ? "terms_accept" : "privacy_acknowledge",
    adult: true,
    ...extra,
  };
  return monitor.query(
    `INSERT INTO legal_acceptances
    (id, user_id, document_id, document_hash, action, adult_confirmed)
    VALUES ($1,$2,$3,$4,$5,$6)`,
    [randomUUID(), user.id, doc.id, value.hash, value.action, value.adult],
  );
};
for (const kind of ["terms", "privacy"]) {
  for (const invalid of ["hash", "action", "adult"]) {
    test(`sql_${kind}_acceptance_rejects_forged_${invalid}`, async () => {
      const user = await newUser();
      const doc = (await read.current()).documents.find((row) => row.kind === kind);
      const extra = {
        hash: { hash: "0".repeat(64) },
        action: { action: kind === "terms" ? "privacy_acknowledge" : "terms_accept" },
        adult: { adult: false },
      }[invalid];
      await expectSql(
        () => insertEvidence(user, doc, extra),
        invalid === "adult" ? "23514" : "P0001",
      );
      assert.deepEqual(await evidence(user.id), []);
    });
  }
}
test("sql_acceptance_rejects_draft_even_with_matching_hash", async () => {
  const user = await newUser();
  const doc = await newDraft();
  await expectSql(() => insertEvidence(user, doc));
  assert.deepEqual(await evidence(user.id), []);
});
test("sql_acceptance_rejects_missing_document", async () => {
  const user = await newUser();
  await expectSql(() =>
    insertEvidence(user, { id: "missing-document", kind: "terms", content_hash: "0".repeat(64) }),
  );
  assert.deepEqual(await evidence(user.id), []);
});
test("sql_acceptance_valid_insert_is_allowed_but_evidence_updates_are_immutable", async () => {
  const user = await newUser();
  const doc = (await read.current()).documents[0];
  await insertEvidence(user, doc);
  const before = await evidence(user.id);
  assert.equal(before.length, 1);
  for (const update of [
    "document_hash = 'forged'",
    "accepted_at = accepted_at + interval '1 day'",
    "adult_confirmed = false",
    "user_id = user_id",
    "action = 'marketing_consent'",
  ]) {
    await expectSql(() =>
      monitor.query(`UPDATE legal_acceptances SET ${update} WHERE id=$1`, [before[0].id]),
    );
    assert.deepEqual(await evidence(user.id), before);
  }
});

test("admin_list_pagination_has_exact_order_no_overlap_and_no_body", async () => {
  for (let i = 0; i < 23; i++) await newDraft(i % 2 ? "privacy" : "terms");
  const expected = await prisma.legal_document_version.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const observed = [];
  for (let page = 1; page <= Math.ceil(expected.length / 20); page++) {
    const result = await adminServices.list({ q: { page } });
    assert.equal(result.total, expected.length);
    assert.equal(result.page, page);
    assert.equal(result.limit, 20);
    assert.equal(result.configured, true);
    assert.deepEqual(
      result.items.map((item) => item.id),
      expected.slice((page - 1) * 20, page * 20).map((row) => row.id),
    );
    for (const item of result.items) {
      assert.equal(Object.hasOwn(JSON.parse(JSON.stringify(item)), "body"), false);
      assert.equal(
        item.acceptance_count,
        await prisma.legal_acceptance.count({ where: { document_id: item.id } }),
      );
      assert.ok(["draft", "published"].includes(item.status));
    }
    observed.push(...result.items.map((item) => item.id));
  }
  assert.equal(new Set(observed).size, expected.length);
  const empty = await read.list(Math.ceil(expected.length / 20) + 1);
  assert.deepEqual(empty.items, []);
  assert.equal(empty.total, expected.length);
  assert.equal((await adminServices.list({ q: {} })).page, 1);
});

test("admin_acceptance_history_paginates_only_selected_document_without_extra_PII", async () => {
  const current = await read.current();
  const target = current.documents.find((doc) => doc.kind === "terms");
  for (let i = 0; i < 23; i++) {
    const user = await newUser();
    await write.accept(user.id, acceptInput(current.documents));
  }
  const expected = await prisma.legal_acceptance.findMany({
    where: { document_id: target.id },
    orderBy: [{ accepted_at: "desc" }, { id: "desc" }],
  });
  const observed = [];
  for (let page = 1; page <= Math.ceil(expected.length / 20); page++) {
    const result = await adminServices.acceptances({ p: { id: target.id }, q: { page } });
    assert.equal(result.page, page);
    assert.equal(result.limit, 20);
    assert.equal(result.total, expected.length);
    assert.deepEqual(
      result.items.map((row) => row.user_id),
      expected.slice((page - 1) * 20, page * 20).map((row) => row.user_id),
    );
    for (const row of result.items) {
      assert.deepEqual(Object.keys(row).sort(), [
        "accepted_at",
        "document_id",
        "kind",
        "user_id",
        "user_name",
        "version",
      ]);
      assert.equal(row.document_id, target.id);
      assert.equal(row.kind, target.kind);
      assert.equal(row.version, target.version);
      assert.equal(new Date(row.accepted_at).toISOString(), row.accepted_at);
      assert.equal(
        row.user_name,
        (await prisma.user.findUniqueOrThrow({ where: { id: row.user_id } })).name,
      );
    }
    observed.push(...result.items.map((row) => row.user_id));
  }
  assert.equal(new Set(observed).size, expected.length);
  assert.deepEqual(
    (await read.acceptances(target.id, Math.ceil(expected.length / 20) + 1)).items,
    [],
  );
  assert.equal((await read.detail(target.id)).acceptance_count, expected.length);
});

// Full real app handler and route graph, not a test-only Express/router mount.
// Import app (not the scheduler bootstrap): no campaigns, dunning or provider jobs are started.
test("real_app_handler_boots_without_oauth_health_ready_and_ping", async () => {
  assert.equal(
    Object.keys(process.env).some((key) => /GOOGLE|OAUTH|CALLBACK/.test(key)),
    false,
  );
  httpServer = require("/app/dist/main/server/app.js").default;
  const i18n = require("/app/dist/main/server/i18n.js").default;
  if (!i18n.isInitialized) {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("I18nInitializationTimeout")), 5000);
      const initialized = () => {
        clearTimeout(timer);
        i18n.off("initialized", initialized);
        resolve();
      };
      i18n.on("initialized", initialized);
    });
  }
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", resolve);
  });
  const address = httpServer.address();
  assert.equal(address.address, "127.0.0.1");
  httpOrigin = `http://127.0.0.1:${address.port}`;
  for (const [route, key, expected] of [
    ["/health", "status", "ok"],
    ["/ready", "status", "ready"],
    ["/ping", "version", require("/app/package.json").version],
  ]) {
    const response = await fetch(`${httpOrigin}${route}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal((await response.json())[key], expected);
  }
});

for (const [name, route] of [
  ["login", "/api/public/google/login"],
  ["login_device", "/api/public/google/login/isolated-legal-device"],
  ["callback", "/api/public/google/callback"],
]) {
  test(`real_http_google_${name}_without_oauth_is_controlled_503`, async () => {
    const response = await fetch(`${httpOrigin}${route}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.match(response.headers.get("cache-control"), /no-store/);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.equal(body.code, "google_oauth_not_configured");
    assert.deepEqual(Object.keys(body).sort(), ["code", "error", "status", "success"]);
    assert.equal(body.status, 503);
    assert.equal(typeof body.error, "string");
    assert.ok(body.error.length > 0);
    assert.doesNotMatch(
      body.error,
      /GOOGLE_CLIENT|clientID|clientSecret|OAuth2Strategy|TypeError|stack|postgres|prisma/i,
    );
  });
}

test("real_http_local_login_validation_remains_available_without_oauth", async () => {
  const response = await fetch(`${httpOrigin}/api/public/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-device": "isolated-legal-device" },
    body: JSON.stringify({}),
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
});

test("real_http_public_legal_uses_complete_handler_and_real_published_bundle", async () => {
  const before = await prisma.legal_acceptance.count();
  const response = await fetch(`${httpOrigin}/api/public/legal/current`, {
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.configured, true);
  assert.deepEqual(idsOf(body.data.documents), idsOf((await read.current()).documents));
  for (const doc of body.data.documents) assert.equal((await stored(doc.id)).status, "published");
  assert.equal(await prisma.legal_acceptance.count(), before);
});

const httpJson = async (route, { actor, body, method = "POST" } = {}) => {
  assert.ok(route.startsWith("/api/"));
  const response = await fetch(`${httpOrigin}${route}`, {
    method,
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": "pt",
      "x-device": actor?.device ?? "isolated-legal-registration-device",
      ...(actor?.token ? { Authorization: `Bearer ${actor.token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
};
const invalidBoolean = (response, field) => {
  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  // Prove the intended flag caused rejection, not invalid unrelated input/authentication.
  assert.deepEqual(Object.keys(response.body.errors.body), [field]);
  assert.equal(typeof response.body.errors.body[field], "string");
  assert.ok(response.body.errors.body[field].length > 0);
  assert.doesNotMatch(response.body.errors.body[field], /expected|boolean|undefined|Zod|stack/i);
};
const httpDraft = async () => {
  const response = await httpJson("/api/admin/private/settings/legal", {
    actor: httpAdmin,
    body: { kind: "terms", ...draftValue() },
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, "draft");
  return response.body.data;
};
const registrationBody = (adult) => {
  const password = `Local!Aa9-${randomUUID()}`;
  return {
    name: "Cadastro efêmero de contrato",
    email: `legal-register-${++sequence}@example.invalid`,
    role: "paciente",
    password,
    password_confirm: password,
    terms_accepted: true,
    ...(adult === undefined ? {} : { adult_confirmed: adult }),
  };
};

test("real_HTTP_local_user_and_admin_login_issue_persisted_sessions", async () => {
  const { encrypt } = require("/app/dist/utils/crypt/index.js");
  const password = `Local!Aa9-${randomUUID()}`;
  const hashed = await encrypt(password);
  for (const kind of ["user", "admin"]) {
    const data = {
      name: "Conta efêmera de sessão legal",
      email: `legal-http-${kind}@example.invalid`,
      password: hashed,
      confirmed: true,
    };
    const account =
      kind === "user"
        ? await prisma.user.create({ data: { ...data, role: "paciente" } })
        : await prisma.admin.create({ data });
    const device = `isolated-legal-http-${kind}`;
    const response = await httpJson(
      kind === "user" ? "/api/public/auth/login" : "/api/admin/public/auth/login",
      {
        actor: { device },
        body: { email: account.email, password },
      },
    );
    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    const token = response.body.data[`${kind}_tokens`][0].token;
    assert.equal(typeof token, "string");
    const session = await prisma[`${kind}_token`].findFirst({
      where: { [`${kind}_id`]: account.id, token, device_id: device },
    });
    assert.ok(session);
    const actor = { id: account.id, device, token };
    if (kind === "user") httpUser = actor;
    else httpAdmin = actor;
  }
});

test("real_HTTP_legal_guards_require_correct_authenticated_audience", async () => {
  for (const [route, actor] of [
    ["/api/private/legal/status", undefined],
    ["/api/admin/private/settings/legal", undefined],
    ["/api/private/legal/status", httpAdmin],
    ["/api/admin/private/settings/legal", httpUser],
  ]) {
    const response = await httpJson(route, { method: "GET", actor });
    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
  }
  assert.equal(
    (await httpJson("/api/private/legal/status", { method: "GET", actor: httpUser })).status,
    200,
  );
  assert.equal(
    (await httpJson("/api/admin/private/settings/legal", { method: "GET", actor: httpAdmin }))
      .status,
    200,
  );
});

for (const field of ["terms_accepted", "privacy_acknowledged", "adult_confirmed"]) {
  test(`real_HTTP_accept_${field}_rejects_non_boolean_without_evidence`, async () => {
    const current = await read.current();
    const before = await evidence(httpUser.id);
    for (const invalid of ["true", "false", 1, 0, null, undefined]) {
      const response = await httpJson("/api/private/legal/accept", {
        actor: httpUser,
        body: acceptInput(current.documents, { [field]: invalid }),
      });
      invalidBoolean(response, field);
      assert.deepEqual(await evidence(httpUser.id), before);
    }
  });
}
for (const field of ["terms_accepted", "privacy_acknowledged", "adult_confirmed"]) {
  test(`real_HTTP_accept_${field}_literal_false_is_domain_422`, async () => {
    const before = await evidence(httpUser.id);
    const response = await httpJson("/api/private/legal/accept", {
      actor: httpUser,
      body: acceptInput((await read.current()).documents, { [field]: false }),
    });
    assert.equal(response.status, 422);
    assert.equal(
      response.body.code,
      field === "adult_confirmed" ? "adult_declaration_required" : "legal_acceptance_required",
    );
    assert.deepEqual(await evidence(httpUser.id), before);
  });
}

test("real_HTTP_accept_literal_true_records_current_pair_and_retry_is_idempotent", async () => {
  const current = await read.current();
  const response = await httpJson("/api/private/legal/accept", {
    actor: httpUser,
    body: acceptInput(current.documents),
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  consistentStatus(response.body.data);
  assert.deepEqual(response.body.data.pending_document_ids, []);
  const rows = await evidence(httpUser.id);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.document_id).sort(), idsOf(current.documents));
  for (const row of rows)
    assert.equal(row.document_hash, documentHash(await stored(row.document_id)));
  assert.equal(
    (
      await httpJson("/api/private/legal/accept", {
        actor: httpUser,
        body: acceptInput(current.documents),
      })
    ).status,
    200,
  );
  assert.deepEqual(await evidence(httpUser.id), rows);
});

test("real_HTTP_admin_publish_rejects_non_boolean_review_without_mutation_or_audit", async () => {
  const doc = await httpDraft();
  const before = await stored(doc.id);
  const beforeLogs = await logs(doc.id);
  for (const invalid of ["true", "false", 1, 0, null, undefined]) {
    const response = await httpJson(`/api/admin/private/settings/legal/${doc.id}/publish`, {
      actor: httpAdmin,
      body: { revision: doc.revision, review_confirmed: invalid },
    });
    invalidBoolean(response, "review_confirmed");
    assert.deepEqual(await stored(doc.id), before);
    assert.deepEqual(await logs(doc.id), beforeLogs);
  }
});

test("real_HTTP_admin_publish_literal_false_is_domain_422", async () => {
  const doc = await httpDraft();
  const before = await stored(doc.id);
  const beforeLogs = await logs(doc.id);
  const response = await httpJson(`/api/admin/private/settings/legal/${doc.id}/publish`, {
    actor: httpAdmin,
    body: { revision: doc.revision, review_confirmed: false },
  });
  assert.equal(response.status, 422);
  assert.equal(response.body.code, "legal_review_required");
  assert.deepEqual(await stored(doc.id), before);
  assert.deepEqual(await logs(doc.id), beforeLogs);
});

test("real_HTTP_admin_publish_literal_true_publishes_exact_revision_and_actor", async () => {
  const doc = await httpDraft();
  const response = await httpJson(`/api/admin/private/settings/legal/${doc.id}/publish`, {
    actor: httpAdmin,
    body: { revision: doc.revision, review_confirmed: true },
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.status, "published");
  const row = await stored(doc.id);
  assert.equal(row.revision, doc.revision + 1);
  assert.equal(row.content_hash, documentHash(doc));
  assert.equal(row.published_by_admin_id, httpAdmin.id);
  assert.equal(
    (await logs(doc.id)).filter((event) => event.action === "document_published").length,
    1,
  );
});

for (const invalid of ["true", "false"]) {
  test(`real_HTTP_registration_adult_string_${invalid}_rejected_without_user`, async () => {
    const input = registrationBody(invalid);
    const beforeUsers = await prisma.user.count();
    const beforeDeclarations = await prisma.user_background.count({
      where: { type: "adult_declaration" },
    });
    const response = await httpJson("/api/public/user/store", { body: input });
    invalidBoolean(response, "adult_confirmed");
    assert.equal(await prisma.user.count(), beforeUsers);
    assert.equal(await prisma.user.findUnique({ where: { email: input.email } }), null);
    assert.equal(
      await prisma.user_background.count({ where: { type: "adult_declaration" } }),
      beforeDeclarations,
    );
  });
}
for (const value of [false, undefined]) {
  test(`real_HTTP_registration_adult_${String(value)}_is_domain_422_after_bundle`, async () => {
    assert.equal((await read.current()).configured, true);
    const input = registrationBody(value);
    const before = await prisma.user.count();
    const response = await httpJson("/api/public/user/store", { body: input });
    assert.equal(response.status, 422);
    assert.equal(response.body.code, "adult_declaration_required");
    assert.equal(await prisma.user.count(), before);
    assert.equal(await prisma.user.findUnique({ where: { email: input.email } }), null);
  });
}

test("real_HTTP_registration_adult_true_creates_only_explicit_declaration", async () => {
  const input = registrationBody(true);
  const beforeUsers = await prisma.user.count();
  const beforeAcceptances = await prisma.legal_acceptance.count();
  const response = await httpJson("/api/public/user/store", { body: input });
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  const user = await prisma.user.findUniqueOrThrow({ where: { email: input.email } });
  assert.equal(await prisma.user.count(), beforeUsers + 1);
  assert.equal(user.confirmed, false);
  const declarations = await prisma.user_background.findMany({
    where: { user_id: user.id, type: "adult_declaration" },
  });
  assert.equal(declarations.length, 1);
  assert.equal(declarations[0].data.minimum_age, 18);
  assert.equal(declarations[0].data.source, "registration");
  assert.equal(await prisma.legal_acceptance.count(), beforeAcceptances);
  assert.equal(await prisma.user_token.count({ where: { user_id: user.id } }), 1);
});

(async () => {
  assert.equal(cases.length, 107);
  assert.equal(new Set(cases.map((entry) => entry.name)).size, cases.length);
  await monitor.connect();
  const connection = await monitor.query(
    "SELECT current_database() AS database, current_user AS role",
  );
  assert.deepEqual(connection.rows, [{ database: "lectum_audit", role: "lectum_audit" }]);
  assert.equal(await prisma.legal_document_version.count(), 0);
  assert.equal(await prisma.legal_acceptance.count(), 0);
  admin = await prisma.admin.create({
    data: { name: "Admin efêmero", email: "legal-admin@example.invalid" },
  });
  otherAdmin = await prisma.admin.create({
    data: { name: "Segundo Admin efêmero", email: "legal-other-admin@example.invalid" },
  });
  alice = await newUser();
  bob = await newUser();
  for (const entry of cases) {
    stage = entry.name;
    try {
      await entry.run();
      passed++;
      console.log("CHECK_OK", entry.name);
    } catch (error) {
      if (!(error instanceof assert.AssertionError)) throw error;
      failures.push(entry.name);
      // Never emit input values, SQL, provider details, PII or raw errors.
      console.log("CHECK_FAIL", entry.name);
    }
  }
  console.log(
    "PROBE_SUMMARY",
    JSON.stringify({ passed, failed: failures.length, total: cases.length }),
  );
  if (failures.length) process.exitCode = 1;
  else console.log("LEGAL_GOVERNANCE_POSTGRES_OK");
})()
  .catch((error) => {
    // Classify locally, but emit only our closed diagnostic labels, never raw provider output.
    const detail = `${error?.message ?? ""} ${JSON.stringify(error?.meta ?? {})}`;
    const diagnostic = /deserialize.*void|void.*deserialize/isu.test(detail)
      ? "lock_void_result_not_supported"
      : error instanceof LegalError
        ? "unexpected_domain_rejection"
        : error instanceof assert.AssertionError
          ? "assertion_failed"
          : "runtime_or_barrier";
    console.error("INTEGRATION_FAILED", stage, diagnostic);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (httpServer) {
      httpServer.closeAllConnections();
      const { soc } = require("/app/dist/main/socket/state.js");
      if (soc) await new Promise((resolve) => soc.close(resolve));
      else await new Promise((resolve) => httpServer.close(resolve));
    }
    await monitor.end();
    await prisma.$disconnect();
  });
