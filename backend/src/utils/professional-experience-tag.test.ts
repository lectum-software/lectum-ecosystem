import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveProfessionalExperienceTagVisibility } from "./professional-experience-tag";

describe("resolveProfessionalExperienceTagVisibility", () => {
  it("mantem ligado quando o perfil ja permite o selo", () => {
    assert.equal(
      resolveProfessionalExperienceTagVisibility({
        profile: {
          show_experience_tag: true,
          updatedAt: new Date("2026-08-13T12:00:00.000Z"),
        },
      }),
      true,
    );
  });

  it("mantem desligado no plano gratuito", () => {
    assert.equal(
      resolveProfessionalExperienceTagVisibility({
        profile: {
          show_experience_tag: false,
          updatedAt: new Date("2026-08-13T12:00:00.000Z"),
        },
        subscription: {
          createdAt: new Date("2026-08-13T13:00:00.000Z"),
          plan: {
            slug: "gratuito",
          },
        },
      }),
      false,
    );
  });

  it("liga por default ao entrar na camada profissional depois do perfil gratuito", () => {
    assert.equal(
      resolveProfessionalExperienceTagVisibility({
        profile: {
          show_experience_tag: false,
          updatedAt: new Date("2026-08-13T12:00:00.000Z"),
        },
        subscription: {
          createdAt: new Date("2026-08-13T13:00:00.000Z"),
          plan: {
            slug: "profissional",
          },
        },
      }),
      true,
    );
  });

  it("preserva desligado quando o profissional desliga apos ter entitlement", () => {
    assert.equal(
      resolveProfessionalExperienceTagVisibility({
        profile: {
          show_experience_tag: false,
          updatedAt: new Date("2026-08-13T14:00:00.000Z"),
        },
        subscription: {
          createdAt: new Date("2026-08-13T13:00:00.000Z"),
          plan: {
            slug: "profissional",
          },
        },
      }),
      false,
    );
  });
});
