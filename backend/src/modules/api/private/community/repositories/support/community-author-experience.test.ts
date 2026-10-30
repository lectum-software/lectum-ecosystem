import assert from "node:assert/strict";
import { before, test } from "node:test";
import { crpExperienceYears } from "@/utils/professional-experience";
import type { AuthorResult } from "./community-feed";
import type * as CommunityResponse from "./community-response";

process.env.DATABASE_URL ??= "postgresql://lectum:lectum@localhost:5432/lectum_test";
process.env.JWT_SECRET_KEY ??= "lectum-test-jwt-secret-key-32-bytes";

let serializers: Array<typeof CommunityResponse.toAuthorResponse>;
before(async () => {
  const community = await import("./community-response");
  const posts = await import("../../../posts/repositories/support/post-response");
  serializers = [community.toAuthorResponse, posts.toAuthorResponse];
});

const author = (): AuthorResult => ({
  active: true,
  deleted: false,
  id: "professional",
  name: "Ana Lima",
  avatar: null,
  role: "psicologo",
  psychologist_profile: {
    deleted: false,
    published: true,
    professional_first_name: "Ana",
    professional_last_name: "Lima",
    gender: "feminino",
    crp: "06/123456",
    crp_status: "aprovado",
    cfp_verified_at: null,
    whatsapp: null,
    video_url: "/public/files/profile/video.mp4",
    crp_registration_date: new Date("2012-01-01T12:00:00Z"),
    show_experience_tag: true,
    updatedAt: new Date("2026-08-14T12:00:00Z"),
    subscriptions: [
      {
        id: "subscription",
        source: "admin_grant",
        createdAt: new Date("2026-08-13T12:00:00Z"),
        grant_started_at: null,
      },
    ],
  },
});

test("community and post serializers expose only eligible public experience", () => {
  for (const serialize of serializers) {
    const input = author();
    const result = serialize(input);
    assert.equal(result.type_label, "Psicóloga");
    assert.equal(result.show_experience_tag, true);
    assert.equal(
      result.formation_years,
      crpExperienceYears(input.psychologist_profile!.crp_registration_date),
    );
    assert.equal("crp_registration_date" in result, false);
  }
});

test("an explicit opt-out after entitlement never exposes years to API consumers", () => {
  for (const serialize of serializers) {
    const input = author();
    input.psychologist_profile!.show_experience_tag = false;
    const result = serialize(input);
    assert.equal(result.show_experience_tag, false);
    assert.equal(result.formation_years, null);
  }
});

test("legacy free-profile preference follows the directory entitlement transition", () => {
  for (const serialize of serializers) {
    const input = author();
    input.psychologist_profile!.show_experience_tag = false;
    input.psychologist_profile!.updatedAt = new Date("2026-08-12T12:00:00Z");
    assert.equal(serialize(input).show_experience_tag, true);
  }
});

test("unavailable, unverified, patient and sparse authors fail closed", () => {
  const cases: Array<(input: AuthorResult) => void> = [
    (input) => {
      input.active = false;
    },
    (input) => {
      input.deleted = true;
    },
    (input) => {
      input.role = "paciente";
    },
    (input) => {
      input.psychologist_profile = null;
    },
    (input) => {
      input.psychologist_profile!.deleted = true;
    },
    (input) => {
      input.psychologist_profile!.published = false;
    },
    (input) => {
      input.psychologist_profile!.video_url = null;
    },
    (input) => {
      input.psychologist_profile!.subscriptions = [];
    },
    (input) => {
      input.psychologist_profile!.crp_status = "pendente";
      input.psychologist_profile!.subscriptions[0]!.source = "gateway";
    },
    (input) => {
      Reflect.deleteProperty(input.psychologist_profile!, "show_experience_tag");
    },
    (input) => {
      input.psychologist_profile!.show_experience_tag = false;
      Reflect.deleteProperty(input.psychologist_profile!, "updatedAt");
    },
  ];
  for (const serialize of serializers) {
    for (const modify of cases) {
      const input = author();
      modify(input);
      const result = serialize(input, 0, input.role === "paciente");
      assert.equal(result.show_experience_tag, false);
      assert.equal(result.formation_years, null);
    }
  }
});

test("missing or invalid registration dates never become zero experience", () => {
  for (const serialize of serializers) {
    for (const date of [null, new Date("invalid"), new Date("2100-01-01T12:00:00Z")]) {
      const input = author();
      input.psychologist_profile!.crp_registration_date = date;
      assert.equal(serialize(input).formation_years, null);
    }
  }
});
