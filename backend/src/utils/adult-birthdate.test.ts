import assert from "node:assert/strict";
import test from "node:test";
import {
  adultBirthdateDateSchema,
  adultBirthdateSchema,
  isAdultBirthdate,
  registrationBirthdate,
} from "./adult-birthdate";

test("server validates exact dates and the eighteenth birthday", () => {
  const today = new Date("2026-10-22T12:00:00Z");
  assert.equal(isAdultBirthdate("2008-10-22", today), true);
  assert.equal(isAdultBirthdate("2008-10-23", today), false);
  assert.equal(isAdultBirthdate("2008-10-21", today), true);
  for (const value of [
    "",
    "2000-02-31",
    "2001-02-29",
    "2100-01-01",
    "2020-01-01",
    "01/01/1990",
    "1899-01-01",
  ]) {
    assert.equal(adultBirthdateSchema.safeParse(value).success, false, value);
    assert.throws(() => registrationBirthdate(value));
  }
  assert.equal(registrationBirthdate(undefined), undefined);
  assert.equal(registrationBirthdate("2000-02-29")?.toISOString(), "2000-02-29T00:00:00.000Z");
  assert.equal(
    adultBirthdateDateSchema.parse("1990-04-03").toISOString(),
    "1990-04-03T00:00:00.000Z",
  );
});
