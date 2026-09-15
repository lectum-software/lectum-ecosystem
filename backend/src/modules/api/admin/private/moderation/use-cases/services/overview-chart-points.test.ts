import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chartDateKey, incrementChartPoint, sortChartPoints } from "./overview-chart-points";

const createPoint = (date: string) => ({ date, dismissed: 0, pending: 0 });

describe("pontos dos gráficos de Moderação — calendário de São Paulo", () => {
  it("mantém eventos noturnos no dia civil, mesmo depois da virada UTC", () => {
    assert.equal(chartDateKey(new Date("2026-09-13T00:00:00.000Z")), "2026-09-12");
    assert.equal(chartDateKey(new Date("2026-09-13T02:59:59.999Z")), "2026-09-12");
  });

  it("troca o dia exatamente à meia-noite de São Paulo", () => {
    assert.equal(chartDateKey(new Date("2026-09-13T03:00:00.000Z")), "2026-09-13");
    assert.equal(chartDateKey(new Date("2026-09-13T03:00:00.001Z")), "2026-09-13");
  });

  it("preserva viradas de mês e ano sem deslocar eventos da véspera", () => {
    assert.equal(chartDateKey(new Date("2027-01-01T02:59:59.999Z")), "2026-12-31");
    assert.equal(chartDateKey(new Date("2027-01-01T03:00:00.000Z")), "2027-01-01");
    assert.equal(chartDateKey(new Date("2026-10-01T00:15:00.000Z")), "2026-09-30");
  });

  it("preserva o dia bissexto no calendário local", () => {
    assert.equal(chartDateKey(new Date("2024-03-01T02:59:59.999Z")), "2024-02-29");
    assert.equal(chartDateKey(new Date("2024-03-01T03:00:00.000Z")), "2024-03-01");
  });

  it("respeita o horário de verão histórico, sem offset fixo de três horas", () => {
    assert.equal(chartDateKey(new Date("2018-12-01T01:59:59.999Z")), "2018-11-30");
    assert.equal(chartDateKey(new Date("2018-12-01T02:00:00.000Z")), "2018-12-01");
  });

  it("representações do mesmo instante têm a mesma chave", () => {
    const utc = new Date("2026-09-13T01:00:00.000Z");
    const local = new Date("2026-09-12T22:00:00.000-03:00");
    assert.equal(chartDateKey(utc), chartDateKey(local));
    assert.equal(chartDateKey(local), "2026-09-12");
  });

  it("não altera o instante recebido nem esconde datas inválidas", () => {
    const date = new Date("2026-09-13T01:00:00.000Z");
    const before = date.getTime();
    chartDateKey(date);
    assert.equal(date.getTime(), before);
    assert.throws(() => chartDateKey(new Date(Number.NaN)), RangeError);
  });

  it("acumula no mesmo ponto um dia civil que cruza dois dias UTC", () => {
    const map = new Map<string, ReturnType<typeof createPoint>>();
    incrementChartPoint(map, new Date("2026-09-12T20:00:00.000Z"), createPoint, "pending");
    incrementChartPoint(map, new Date("2026-09-13T01:00:00.000Z"), createPoint, "pending");
    incrementChartPoint(map, new Date("2026-09-13T02:59:59.999Z"), createPoint, "dismissed");
    assert.deepEqual(sortChartPoints(map), [{ date: "2026-09-12", dismissed: 1, pending: 2 }]);
  });

  it("separa dias civis na fronteira local e mantém ordenação e contagens", () => {
    const map = new Map<string, ReturnType<typeof createPoint>>();
    incrementChartPoint(map, new Date("2026-09-13T03:00:00.000Z"), createPoint, "pending");
    incrementChartPoint(map, new Date("2026-09-13T02:59:59.999Z"), createPoint, "dismissed");
    const points = sortChartPoints(map);
    assert.deepEqual(points, [
      { date: "2026-09-12", dismissed: 1, pending: 0 },
      { date: "2026-09-13", dismissed: 0, pending: 1 },
    ]);
    assert.equal(
      points.reduce((total, point) => total + point.pending + point.dismissed, 0),
      2,
    );
    assert.deepEqual([...map.keys()], ["2026-09-13", "2026-09-12"]);
  });

  it("mantém o resultado vazio sem criar datas ou eventos", () => {
    assert.deepEqual(sortChartPoints(new Map()), []);
  });
});
