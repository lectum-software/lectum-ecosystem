import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getRelativeTime, groupNotifications } from "./notification-time.ts";

test("tempo relativo preserva os arredondamentos e fallbacks existentes", (t) => {
  const now = new Date(2026, 9, 27, 12, 30).getTime();
  t.mock.timers.enable({ apis: ["Date"], now });

  assert.equal(getRelativeTime(), "agora");
  assert.equal(getRelativeTime(""), "agora");
  for (const [elapsedMinutes, expected] of [
    [-60, "1 min"],
    [0, "1 min"],
    [1.5, "2 min"],
    [59, "59 min"],
    [60, "1 h"],
    [90, "2 h"],
    [23 * 60, "23 h"],
    [24 * 60, "1 d"],
    [48 * 60, "2 d"],
  ]) {
    assert.equal(getRelativeTime(new Date(now - elapsedMinutes * 60_000).toISOString()), expected);
  }
  assert.equal(getRelativeTime("invalid-date"), "NaN d");
});

test("agrupamento mantém o início do dia local, ordem, referências e entrada intacta", (t) => {
  const now = new Date(2026, 9, 27, 12, 30).getTime();
  const dayStart = new Date(2026, 9, 27).getTime();
  t.mock.timers.enable({ apis: ["Date"], now });
  const previous = Object.freeze({
    id: "previous",
    createdAt: new Date(dayStart - 1).toISOString(),
  });
  const today = Object.freeze({ id: "today", createdAt: new Date(dayStart).toISOString() });
  const missingDate = Object.freeze({ id: "missing-date" });
  const future = Object.freeze({
    id: "future",
    createdAt: new Date(now + 86_400_000).toISOString(),
  });
  const invalidDate = Object.freeze({ id: "invalid-date", createdAt: "invalid-date" });
  const items = Object.freeze([previous, today, missingDate, future, invalidDate]);
  const grouped = groupNotifications(items);

  assert.deepEqual(grouped, {
    today: [today, missingDate, future],
    previous: [previous, invalidDate],
  });
  assert.equal(grouped.today[0], today);
  assert.equal(grouped.previous[0], previous);
  assert.deepEqual(items, [previous, today, missingDate, future, invalidDate]);
});

test("agrupamento vazio mantém os dois grupos independentes", () => {
  const grouped = groupNotifications([]);
  assert.deepEqual(grouped, { today: [], previous: [] });
  assert.notEqual(grouped.today, grouped.previous);
});

test("a tela usa o módulo temporal sem redefinir as funções extraídas", () => {
  const source = readFileSync(new URL("./logic.tsx", import.meta.url), "utf8");
  assert.match(
    source,
    /import \{ getRelativeTime, groupNotifications \} from "\.\/notification-time";/,
  );
  assert.doesNotMatch(source, /const (startOfToday|getRelativeTime|groupNotifications) =/);
  assert.match(source, /useMemo\(\(\) => groupNotifications\(items\), \[items\]\)/);
  assert.equal(source.match(/getRelativeTime\(item.createdAt\)/g)?.length, 2);
});
