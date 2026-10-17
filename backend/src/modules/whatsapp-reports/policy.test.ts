import assert from "node:assert/strict";
import test from "node:test";
import {
  hashWhatsappVisitor,
  previousWhatsappWeek,
  reportDates,
  validAcquiredCount,
} from "./policy";

test("semana inclui domingo inteiro e fica disponivel segunda 09h de Brasilia", () => {
  const now = new Date("2026-10-19T12:00:00Z");
  const week = previousWhatsappWeek(now);
  assert.equal(week.start.toISOString(), "2026-10-12T03:00:00.000Z");
  assert.equal(week.end.toISOString(), "2026-10-19T03:00:00.000Z");
  assert.equal(week.availableAt.toISOString(), now.toISOString());
  assert.deepEqual(reportDates(week.start, week.end), { start_label: "12/10", end_label: "18/10" });
});
test("antes das 09h nao libera a nova semana; quinta usa a mesma semana", () => {
  const early = new Date("2026-10-19T11:59:59Z");
  assert.ok(early < previousWhatsappWeek(early).availableAt);
  assert.deepEqual(
    previousWhatsappWeek(new Date("2026-10-22T12:00:00Z")),
    previousWhatsappWeek(new Date("2026-10-19T12:00:00Z")),
  );
});
test("domingo UTC ainda e sabado em Brasilia; suporta virada do ano", () => {
  assert.equal(
    previousWhatsappWeek(new Date("2026-10-19T02:59:59Z")).start.toISOString(),
    "2026-10-05T03:00:00.000Z",
  );
  const week = previousWhatsappWeek(new Date("2027-01-04T12:00:00Z"));
  assert.deepEqual(reportDates(week.start, week.end), { start_label: "28/12", end_label: "03/01" });
});
test("zero e resposta; ausencia, fracao, negativos e excesso nao sao", () => {
  for (const value of [0, 1, 10]) assert.equal(validAcquiredCount(value, 10), true);
  for (const value of [null, undefined, "", "0", -1, 0.5, 11, NaN, Infinity])
    assert.equal(validAcquiredCount(value, 10), false);
});
test("identidade anonima e estavel e nao conserva identificador bruto", () => {
  const id = "64bd1f2a-7ee4-4f38-962e-f2595ccde8bb";
  assert.equal(hashWhatsappVisitor(id), hashWhatsappVisitor(id));
  assert.notEqual(hashWhatsappVisitor(id), id);
  for (const value of [undefined, null, "", "<script>", "a".repeat(121)])
    assert.equal(hashWhatsappVisitor(value), null);
});
