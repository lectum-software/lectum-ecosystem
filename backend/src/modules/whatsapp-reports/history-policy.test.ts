import assert from "node:assert/strict";
import test from "node:test";
import {
  editableWhatsappWeek,
  parseWhatsappWeek,
  previousWhatsappWeek,
  WHATSAPP_WEEK_MS,
} from "./policy";

test("janela inclui semana atual e quatro anteriores, nunca futura ou quinta anterior", () => {
  const now = new Date("2026-10-19T12:00:00Z");
  const start = previousWhatsappWeek(now).end.getTime();
  for (let index = 0; index <= 4; index++)
    assert.equal(editableWhatsappWeek(new Date(start - index * WHATSAPP_WEEK_MS), now), true);
  for (const delta of [-5 * WHATSAPP_WEEK_MS, WHATSAPP_WEEK_MS, 1, -1])
    assert.equal(editableWhatsappWeek(new Date(start + delta), now), false);
});
test("virada semanal usa segunda meia-noite de Sao Paulo", () => {
  const earliest = new Date("2026-09-21T03:00:00Z");
  assert.equal(editableWhatsappWeek(earliest, new Date("2026-10-26T02:59:59Z")), true);
  assert.equal(editableWhatsappWeek(earliest, new Date("2026-10-26T03:00:00Z")), false);
});
test("identificador semanal exige data real e segunda-feira", () => {
  assert.equal(parseWhatsappWeek("2026-10-19")?.toISOString(), "2026-10-19T03:00:00.000Z");
  for (const value of ["2026-02-30", "2026-10-20", "invalid", "2026-10-19T00:00:00Z"])
    assert.equal(parseWhatsappWeek(value), null);
});
