import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { crpExperienceYears, parseCrpRegistrationDate } from "./professional-experience";

describe("parseCrpRegistrationDate", () => {
  it("aceita hoje durante todo o dia civil de São Paulo, inclusive antes do meio-dia", () => {
    for (const time of [
      "00:00:00.000",
      "08:00:00.000",
      "11:59:59.999",
      "12:00:00.000",
      "23:59:59.999",
    ]) {
      const now = new Date(`2026-09-11T${time}-03:00`);
      for (const value of ["2026-09-11", "11/09/2026", "  2026-09-11  "]) {
        assert.equal(
          parseCrpRegistrationDate(value, { now })?.toISOString(),
          "2026-09-11T15:00:00.000Z",
          `${value} às ${time}`,
        );
      }
    }
  });

  it("muda o dia na meia-noite de São Paulo, não na meia-noite UTC", () => {
    const beforeMidnight = new Date("2026-09-12T02:59:59.999Z");
    const midnight = new Date("2026-09-12T03:00:00.000Z");

    assert.equal(
      parseCrpRegistrationDate("2026-09-11", { now: beforeMidnight })?.toISOString(),
      "2026-09-11T15:00:00.000Z",
    );
    assert.equal(parseCrpRegistrationDate("2026-09-12", { now: beforeMidnight }), null);
    assert.equal(
      parseCrpRegistrationDate("2026-09-12", { now: midnight })?.toISOString(),
      "2026-09-12T15:00:00.000Z",
    );
  });

  it("compara componentes civis também na virada do mês", () => {
    const now = new Date("2026-03-01T02:59:59.999Z");

    assert.equal(
      parseCrpRegistrationDate("28/02/2026", { now })?.toISOString(),
      "2026-02-28T15:00:00.000Z",
    );
    assert.equal(parseCrpRegistrationDate("2026-03-01", { now }), null);
  });

  it("usa o ano da mesma referência em São Paulo para validar a virada do ano", () => {
    const beforeMidnight = new Date("2026-01-01T02:59:59.999Z");
    const midnight = new Date("2026-01-01T03:00:00.000Z");

    assert.equal(
      parseCrpRegistrationDate("2025-12-31", { now: beforeMidnight })?.toISOString(),
      "2025-12-31T15:00:00.000Z",
    );
    assert.equal(parseCrpRegistrationDate("2026-01-01", { now: beforeMidnight }), null);
    assert.equal(
      parseCrpRegistrationDate("2026-01-01", { allowFuture: true, now: beforeMidnight }),
      null,
    );
    assert.equal(
      parseCrpRegistrationDate("2026-01-01", { now: midnight })?.toISOString(),
      "2026-01-01T15:00:00.000Z",
    );
  });

  it("preserva allowFuture sem ampliar o intervalo de anos aceito", () => {
    const now = new Date("2026-09-11T08:00:00-03:00");

    for (const value of ["2026-09-12", "12/09/2026", "2026-12-31", "2026-09-12T18:00:00Z"]) {
      assert.equal(parseCrpRegistrationDate(value, { now }), null);
      assert.ok(parseCrpRegistrationDate(value, { allowFuture: true, now }) instanceof Date);
    }
    for (const allowFuture of [false, true]) {
      assert.equal(parseCrpRegistrationDate("2027-01-01", { allowFuture, now }), null);
      assert.equal(parseCrpRegistrationDate("1949-12-31", { allowFuture, now }), null);
    }
    assert.equal(
      parseCrpRegistrationDate("1950-01-01", { now })?.toISOString(),
      "1950-01-01T15:00:00.000Z",
    );
  });

  it("preserva timestamps legados convertendo seu dia no fuso São Paulo", () => {
    const now = new Date("2026-09-11T08:00:00-03:00");

    for (const value of ["2026-09-11T00:30:00Z", "2026-09-11T09:30:00+09:00"]) {
      assert.equal(
        parseCrpRegistrationDate(value, { now })?.toISOString(),
        "2026-09-10T15:00:00.000Z",
      );
    }
    for (const value of ["2026-09-12T02:30:00Z", "Fri, 11 Sep 2026 11:00:00 GMT"]) {
      assert.equal(
        parseCrpRegistrationDate(value, { now })?.toISOString(),
        "2026-09-11T15:00:00.000Z",
      );
    }
    assert.equal(
      parseCrpRegistrationDate("2018-12-01T02:30:00Z", { now })?.toISOString(),
      "2018-12-01T15:00:00.000Z",
    );
  });

  it("respeita o fuso IANA histórico na referência sem mudar a normalização -03", () => {
    const now = new Date("2018-12-01T02:30:00Z");

    assert.equal(
      parseCrpRegistrationDate("2018-12-01", { now })?.toISOString(),
      "2018-12-01T15:00:00.000Z",
    );
    assert.equal(parseCrpRegistrationDate("2018-12-02", { now }), null);
  });

  it("valida bissextos e rejeita calendários impossíveis mesmo com allowFuture", () => {
    const now = new Date("2024-02-29T03:00:00Z");

    assert.equal(
      parseCrpRegistrationDate("29/02/2024", { now })?.toISOString(),
      "2024-02-29T15:00:00.000Z",
    );
    for (const value of [
      "2023-02-29",
      "2024-02-30",
      "31/04/2024",
      "2024-13-01",
      "2024-00-01",
      "2024-01-00",
    ]) {
      for (const allowFuture of [false, true]) {
        assert.equal(parseCrpRegistrationDate(value, { allowFuture, now }), null, value);
      }
    }
  });

  it("retorna null para entradas vazias/inválidas e referência inválida", () => {
    const now = new Date("2026-09-11T08:00:00-03:00");

    for (const value of [undefined, null, "", "  ", "não é uma data"]) {
      assert.equal(parseCrpRegistrationDate(value, { now }), null);
    }
    assert.equal(parseCrpRegistrationDate("2026-09-11", { now: new Date(Number.NaN) }), null);
  });

  it("não modifica a referência explícita e mantém chamadas legadas sem opções", () => {
    const now = new Date("2026-09-11T08:00:00-03:00");
    const originalTime = now.getTime();
    const parsed = parseCrpRegistrationDate("2026-09-11", { now });

    assert.equal(now.getTime(), originalTime);
    assert.notEqual(parsed, now);
    assert.equal(parseCrpRegistrationDate("2000-02-29")?.toISOString(), "2000-02-29T15:00:00.000Z");
    assert.equal(
      parseCrpRegistrationDate("2000-02-29", {})?.toISOString(),
      "2000-02-29T15:00:00.000Z",
    );
    assert.equal(parseCrpRegistrationDate("9999-12-31"), null);
  });
});

describe("crpExperienceYears", () => {
  it("preserva o contrato de ausência, data inválida e experiência menor que um ano", () => {
    assert.equal(crpExperienceYears(), null);
    assert.equal(crpExperienceYears(null), null);
    assert.equal(crpExperienceYears("não é uma data"), null);
    assert.equal(crpExperienceYears(new Date(Number.NaN)), null);
    assert.equal(crpExperienceYears(new Date()), null);
  });
});
