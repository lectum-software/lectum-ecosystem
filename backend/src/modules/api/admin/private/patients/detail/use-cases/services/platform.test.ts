import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type PatientPlatformHourlyActivityInput,
  summarizePlatformHourlyActivity,
  summarizePlatformHourlyActivityByWeekday,
  summarizePlatformPeakActivityHours,
} from "./platform";
import { heatmapParts } from "./publications";

const view = (instant: string, userId: string | null = "local-unit-user") => ({
  id: `local-view-${instant}`,
  duration_seconds: 10,
  normalized_path: "/app/paciente",
  occurred_at: new Date(instant),
  page_kind: "other",
  path: "/app/paciente",
  session_id: "local-unit-session",
  user_id: userId,
});
const input = (
  overrides: Partial<PatientPlatformHourlyActivityInput> = {},
): PatientPlatformHourlyActivityInput => ({
  engagementEvents: [],
  pageViews: [],
  posts: [],
  replies: [],
  reviews: [],
  ...overrides,
});

describe("C3 — atividade horária de pacientes em São Paulo", () => {
  it("alinha todas as métricas à hora local após a virada UTC", () => {
    const instant = "2026-09-13T01:30:00.000Z";
    const event = { createdAt: new Date(instant) };
    const result = summarizePlatformHourlyActivity(
      input({
        engagementEvents: [event],
        pageViews: [view(instant)],
        posts: [event],
        replies: [event],
        reviews: [event],
      }),
    );
    assert.equal(result.length, 24);
    assert.deepEqual(result[22], {
      accesses: 1,
      count: 5,
      engagement: 1,
      hour: 22,
      label: "22h-23h",
      percentage: 100,
      posts: 1,
      replies: 1,
      reviews: 1,
      total: 5,
    });
    assert.equal(result[1].total, 0);
  });

  it("atribui a madrugada UTC ao sábado civil e preserva sete dias completos", () => {
    const days = summarizePlatformHourlyActivityByWeekday(
      input({ posts: [{ createdAt: new Date("2026-09-13T01:30:00.000Z") }] }),
    );
    assert.equal(days.length, 7);
    assert.ok(days.every((day) => day.hours.length === 24));
    assert.equal(days[6].label, "Sáb");
    assert.equal(days[6].hours[22].posts, 1);
    assert.equal(
      days[0].hours.reduce((total, hour) => total + hour.total, 0),
      0,
    );
  });

  it("separa exatamente a meia-noite local, sem produzir hora 24", () => {
    const days = summarizePlatformHourlyActivityByWeekday(
      input({
        posts: [
          { createdAt: new Date("2026-09-13T02:59:59.999Z") },
          { createdAt: new Date("2026-09-13T03:00:00.000Z") },
        ],
      }),
    );
    assert.equal(days[6].hours[23].total, 1);
    assert.equal(days[6].hours[23].label, "23h-00h");
    assert.equal(days[0].hours[0].total, 1);
    assert.equal(days[0].hours[0].label, "00h-01h");
  });

  it("respeita o horário de verão histórico em vez de subtrair três horas fixas", () => {
    const days = summarizePlatformHourlyActivityByWeekday(
      input({ posts: [{ createdAt: new Date("2018-12-02T01:30:00.000Z") }] }),
    );
    assert.equal(days[6].hours[23].total, 1);
    assert.equal(days[6].hours[22].total, 0);
  });

  it("preserva o dia e a hora na virada de ano", () => {
    const days = summarizePlatformHourlyActivityByWeekday(
      input({ posts: [{ createdAt: new Date("2027-01-01T02:30:00.000Z") }] }),
    );
    assert.equal(days[4].label, "Qui");
    assert.equal(days[4].hours[23].total, 1);
  });

  it("mantém ranking, desempate e quatro picos, excluindo acessos anônimos", () => {
    const views = [3, 4, 5, 6, 7, 7].map((hour) =>
      view(`2026-09-13T${String(hour).padStart(2, "0")}:00:00.000Z`),
    );
    views.push(view("2026-09-13T01:00:00.000Z", null));
    const peaks = summarizePlatformPeakActivityHours(views);
    assert.deepEqual(
      peaks.map((peak) => [peak.hour, peak.count]),
      [
        [4, 2],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
    );
    assert.equal(peaks[0].percentage, 33.3);
    assert.equal(peaks[1].percentage, 16.7);
  });

  it("usa o mesmo horário nos picos e no gráfico de acessos", () => {
    const views = [
      view("2026-09-13T01:00:00.000Z"),
      view("2026-09-13T01:30:00.000Z"),
      view("2026-09-13T12:00:00.000Z", null),
    ];
    const hourly = summarizePlatformHourlyActivity(input({ pageViews: views }));
    const peaks = summarizePlatformPeakActivityHours(views);
    assert.equal(peaks[0].hour, 22);
    assert.equal(peaks[0].count, hourly[22].accesses);
    assert.equal(
      hourly.reduce((total, hour) => total + hour.total, 0),
      2,
    );
  });

  it("preserva totais, zeros e respostas vazias", () => {
    assert.deepEqual(summarizePlatformHourlyActivity(input()), []);
    assert.deepEqual(summarizePlatformHourlyActivityByWeekday(input()), []);
    assert.deepEqual(summarizePlatformPeakActivityHours([]), []);
    const activity = input({
      pageViews: [view("2026-09-13T01:00:00.000Z")],
      posts: [{ createdAt: new Date("2026-09-13T03:00:00.000Z") }],
    });
    const hourly = summarizePlatformHourlyActivity(activity);
    const days = summarizePlatformHourlyActivityByWeekday(activity);
    assert.equal(
      hourly.reduce((total, hour) => total + hour.total, 0),
      2,
    );
    assert.equal(
      days.flatMap((day) => day.hours).reduce((total, hour) => total + hour.total, 0),
      2,
    );
    assert.equal(hourly.filter((hour) => hour.total > 0).length, 2);
    assert.equal(hourly[22].percentage, 50);
  });

  it("concorda com as partes civis do heatmap já contratado", () => {
    for (const instant of [
      "2026-09-13T01:30:00.000Z",
      "2026-09-13T03:00:00.000Z",
      "2018-12-02T01:30:00.000Z",
    ]) {
      const date = new Date(instant);
      const heatmap = heatmapParts(date);
      const days = summarizePlatformHourlyActivityByWeekday(
        input({ posts: [{ createdAt: date }] }),
      );
      const day = days.find((entry) => entry.hours.some((hour) => hour.total > 0));
      assert.ok(day);
      assert.equal(day.day, (heatmap.dayIndex + 1) % 7);
      const hour = day.hours.find((entry) => entry.total > 0);
      assert.ok(hour);
      assert.equal(Math.floor(hour.hour / 4) * 4, heatmap.hourBucket);
    }
  });

  it("não altera datas ou coleções recebidas", () => {
    const activity = input({
      pageViews: [view("2026-09-13T01:00:00.000Z")],
      posts: [{ createdAt: new Date("2026-09-13T03:00:00.000Z") }],
    });
    const before = structuredClone(activity);
    summarizePlatformHourlyActivity(activity);
    summarizePlatformHourlyActivityByWeekday(activity);
    summarizePlatformPeakActivityHours(activity.pageViews);
    assert.deepEqual(activity, before);
  });
});
