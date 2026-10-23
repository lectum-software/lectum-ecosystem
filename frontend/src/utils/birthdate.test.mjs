import "../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import {
  adultBirthdateSchema,
  isAdultBirthdate,
  toBirthdateInput,
  toBirthdateIso,
} from "./birthdate.ts";

const { patientProfileSchema, toPatientProfilePayload } = await import(
  "../app/app/profile/edit/use-form.tsx"
);

test("birthdates reject rolled dates, future dates and minors, including birthday boundaries", () => {
  for (const value of ["", "31/02/2000", "29/02/2001", "01/01/2100", "01/01/2020", "2000-01-01"]) {
    assert.equal(adultBirthdateSchema.safeParse(value).success, false, value);
  }
  const today = new Date("2026-10-22T12:00:00Z");
  assert.equal(isAdultBirthdate("22/10/2008", today), true);
  assert.equal(isAdultBirthdate("23/10/2008", today), false);
  assert.equal(isAdultBirthdate("21/10/2008", today), true);
  assert.equal(toBirthdateIso("29/02/2000"), "2000-02-29");
  assert.equal(toBirthdateInput("2000-02-29T00:00:00.000Z"), "29/02/2000");
});

test("patient edits preserve and update dates using the same masked calendar format", () => {
  const profile = { birthdate: "1990-01-02T00:00:00.000Z" };
  const values = patientProfileSchema.parse({ name: "Paciente", birthdate: "03/04/1991" });
  assert.equal(toPatientProfilePayload(values, profile).birthdate, "1991-04-03");
  assert.equal(toPatientProfilePayload({ name: "Paciente" }, profile).birthdate, "1990-01-02");
  assert.equal(
    patientProfileSchema.safeParse({ name: "Paciente", birthdate: "01/01/2020" }).success,
    false,
  );
  assert.equal(patientProfileSchema.safeParse({ name: "Paciente" }).success, true);
});
