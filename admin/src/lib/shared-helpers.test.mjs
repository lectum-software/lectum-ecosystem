import assert from "node:assert/strict";
import test from "node:test";
import { buildDonutCircleSegments, buildPieSlicePath, getPiePoint } from "./chart-geometry.ts";
import { startOfCurrentWeek } from "./date-period.ts";
import { isConfirmedAdminSessionRejection } from "./session-rejection.ts";

test("calcula a segunda-feira local sem alterar a data de referência", () => {
  const reference = new Date(2026, 7, 5, 15, 30);
  const monday = startOfCurrentWeek(reference);

  assert.equal(monday.getDay(), 1);
  assert.equal(monday.getDate(), 3);
  assert.equal(monday.getHours(), 15);
  assert.equal(reference.getDate(), 5);

  const sunday = startOfCurrentWeek(new Date(2026, 7, 9, 8));
  assert.equal(sunday.getDate(), 3);
});

test("preserva ordem e deslocamento dos segmentos de donut visíveis", () => {
  const result = buildDonutCircleSegments(
    [
      { count: 2, id: "a" },
      { count: 0, id: "hidden" },
      { count: 1, id: "b" },
    ],
    4,
    10,
  );

  assert.deepEqual(
    result.visibleItems.map((item) => item.id),
    ["a", "b"],
  );
  assert.equal(result.segments[0]?.strokeDashoffset, -0);
  assert.equal(result.segments[1]?.strokeDashoffset, -Math.PI * 10);
});

test("mantém a geometria compartilhada de fatias de pizza", () => {
  assert.deepEqual(getPiePoint(50, 10, 0), { x: 60, y: 50 });
  assert.match(buildPieSlicePath(50, 10, 0, 90), /^M 50 50 L 60 50 A 10 10 0 0 1 /);
});

test("só encerra o Admin local quando a própria API rejeita a credencial", () => {
  for (const code of [
    "token_device_not_authorized",
    "token_invalid",
    "token_mal_formatted",
    "token_not_authorized",
    "token_not_provided",
  ]) {
    assert.equal(
      isConfirmedAdminSessionRejection({ response: { data: { code }, status: 401 } }),
      true,
    );
  }

  for (const error of [
    new Error("offline"),
    { response: { status: 401 } },
    { response: { data: { code: "proxy_auth_required" }, status: 401 } },
    { response: { data: { code: "token_not_authorized" }, status: 403 } },
    { response: { data: { code: "token_not_authorized" }, status: 500 } },
    { response: { data: { code: "token_not_authorized" }, status: 502 } },
  ]) {
    assert.equal(isConfirmedAdminSessionRejection(error), false);
  }
});
