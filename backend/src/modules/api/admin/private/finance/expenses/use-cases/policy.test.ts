import assert from "node:assert/strict";
import { test } from "node:test";
import type { admin_operating_expense } from "@/external/generated/prisma/client";
import {
  ExpenseError,
  expenseAuditSnapshot,
  expenseCreateSchema,
  expenseCreationFingerprint,
  expenseDateKey,
  expensePayloadSchema,
  expenseQuerySchema,
  expenseUpdateSchema,
  parseExpense,
  toExpenseSqlDate,
  validateExpenseDates,
} from "./policy";
import { expenseTotals } from "./totals";

const payload = {
  amount_cents: 12345,
  category: "software" as const,
  description: "Ferramenta local de validação",
  competence_date: "2001-03-01",
  paid_date: null,
};
const request = "72a5e45b-70b7-4afc-ad7c-2cb8db21e3a3";
test("manual expense accepts only integer BRL cents, bounded known categories and required complete corrections", () => {
  for (const amount of [1, 12345, 99999999])
    assert.equal(
      parseExpense(expensePayloadSchema, { ...payload, amount_cents: amount }).amount_cents,
      amount,
    );
  for (const amount of [0, -1, 100000000, 1.2, NaN, Infinity, "12345", null])
    assert.throws(
      () => parseExpense(expensePayloadSchema, { ...payload, amount_cents: amount }),
      ExpenseError,
    );
  assert.throws(
    () => parseExpense(expensePayloadSchema, { ...payload, category: "unknown" }),
    ExpenseError,
  );
  const { paid_date: _date, ...missing } = payload;
  assert.equal(
    parseExpense(expenseCreateSchema, { ...missing, request_key: request }).paid_date,
    null,
  );
  assert.throws(
    () =>
      parseExpense(expenseUpdateSchema, {
        ...missing,
        expected_revision: 1,
        reason: "Correção controlada",
      }),
    ExpenseError,
  );
});
test("civil dates validate leap/year bounds and roundtrip without shifting SQL DATE to BRT", () => {
  for (const date of ["2000-02-29", "2100-12-31", "2024-02-29"]) {
    const valid = parseExpense(expensePayloadSchema, { ...payload, competence_date: date });
    assert.equal(expenseDateKey(toExpenseSqlDate(valid.competence_date)), date);
  }
  for (const date of [
    "1999-12-31",
    "2101-01-01",
    "2100-02-29",
    "2026-02-30",
    "2026-1-1",
    "2026-11-11T00:00:00Z",
  ])
    assert.throws(
      () => parseExpense(expensePayloadSchema, { ...payload, competence_date: date }),
      ExpenseError,
    );
});
test("manual paid date follows current BRT day and allows prepayment before competence", () => {
  const now = new Date("2026-11-11T01:30:00Z");
  assert.doesNotThrow(() =>
    validateExpenseDates(
      { ...payload, competence_date: "2027-01-01", paid_date: "2026-11-10" },
      now,
    ),
  );
  assert.throws(
    () => validateExpenseDates({ ...payload, paid_date: "2026-11-11" }, now),
    ExpenseError,
  );
  assert.doesNotThrow(() =>
    validateExpenseDates({ ...payload, paid_date: "2026-11-11" }, new Date("2026-11-11T03:00:00Z")),
  );
});
test("creation fingerprint binds actor and normalized original values, not mutable corrections", () => {
  const original = parseExpense(expenseCreateSchema, {
    ...payload,
    description: "  Ferramenta local de validação  ",
    request_key: request.toUpperCase(),
  });
  assert.equal(original.request_key, request);
  const fingerprint = expenseCreationFingerprint("actor-local", original);
  assert.match(fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(fingerprint, expenseCreationFingerprint("actor-local", payload));
  for (const change of [
    { amount_cents: 15000 },
    { description: "Outro custo local" },
    { paid_date: "2000-01-01" },
    { competence_date: "2002-01-01" },
    { category: "other" as const },
  ])
    assert.notEqual(
      fingerprint,
      expenseCreationFingerprint("actor-local", { ...payload, ...change }),
    );
  assert.notEqual(fingerprint, expenseCreationFingerprint("other-actor", payload));
});
test("audit snapshot never copies descriptions or correction/void reason free text", () => {
  const record = {
    ...payload,
    id: "local-expense",
    revision: 3,
    status: "voided",
    currency: "BRL",
    description: "PRIVATE_DESCRIPTION_MARKER",
    competence_date: toExpenseSqlDate(payload.competence_date),
    paid_date: null,
    correction_reason: "PRIVATE_CORRECTION_MARKER",
    void_reason: "PRIVATE_VOID_MARKER",
  } as unknown as admin_operating_expense;
  const audit = expenseAuditSnapshot(record);
  const serialized = JSON.stringify(audit);
  for (const text of [record.description, record.correction_reason, record.void_reason])
    assert.equal(serialized.includes(text!), false);
  assert.match(audit.description_hash, /^[a-f0-9]{64}$/);
  assert.equal(audit.amount_cents, 12345);
});
test("query rejects inverted civil ranges, excessive pages/limits and invalid expense state", () => {
  assert.deepEqual(parseExpense(expenseQuerySchema, {}), { status: "active", page: 1, limit: 20 });
  for (const query of [
    { competence_from: "2026-12-01", competence_to: "2026-01-01" },
    { limit: 101 },
    { page: 0 },
    { status: "deleted" },
  ])
    assert.throws(() => parseExpense(expenseQuerySchema, query), ExpenseError);
});
test("totals distinguish manually marked payments and annulments; unsafe sums never become zero", () => {
  const aggregate = (value: number | null, count: number) => ({
    _sum: { amount_cents: value },
    _count: { _all: count },
  });
  const totals = expenseTotals({
    active: aggregate(22890, 2),
    paid: aggregate(15000, 1),
    voided: aggregate(2001, 1),
  });
  assert.equal(totals.recorded_cents, 22890);
  assert.equal(totals.paid_cents, 15000);
  assert.equal(totals.pending_cents, 7890);
  assert.equal(totals.voided_cents, 2001);
  const unsafe = expenseTotals({
    active: aggregate(Number.MAX_SAFE_INTEGER + 1, 2),
    paid: aggregate(0, 0),
    voided: aggregate(null, 0),
  });
  assert.equal(unsafe.available, false);
  assert.equal(unsafe.recorded_cents, null);
  assert.equal(unsafe.pending_cents, null);
});
