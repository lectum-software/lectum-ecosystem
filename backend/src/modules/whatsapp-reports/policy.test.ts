import assert from "node:assert/strict";
import test from "node:test";
import {
  hashWhatsappVisitor,
  isWhatsappWeekReleased,
  previousWhatsappWeek,
  reportDates,
  validAcquiredCount,
} from "./policy";

test("inicio programado bloqueia semanas antigas e libera a primeira e seguintes", () => {
  const start = "2026-10-19T12:00:00Z";
  const oldWeek = previousWhatsappWeek(new Date("2026-10-17T21:00:00Z"));
  const firstWeek = previousWhatsappWeek(new Date(start));
  const nextWeek = previousWhatsappWeek(new Date("2026-10-26T12:00:00Z"));
  assert.equal(isWhatsappWeekReleased(oldWeek.availableAt, start), false);
  assert.equal(isWhatsappWeekReleased(firstWeek.availableAt, start), true);
  assert.equal(isWhatsappWeekReleased(nextWeek.availableAt, start), true);
  assert.equal(isWhatsappWeekReleased(firstWeek.availableAt, "2026-10-19T12:00:01Z"), false);
});

test("inicio opcional preserva comportamento e configuracao invalida falha fechada", () => {
  const availableAt = new Date("2026-10-19T12:00:00Z");
  for (const value of [undefined, "", "  "])
    assert.equal(isWhatsappWeekReleased(availableAt, value), true);
  for (const value of [
    "invalid",
    "2026-10-19",
    "2026-10-19T09:00:00",
    "2026-02-30T12:00:00Z",
    "2026-10-19T24:00:00Z",
    "2026-10-19T12:00:00Z ",
  ])
    assert.equal(isWhatsappWeekReleased(availableAt, value), false);
});

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
