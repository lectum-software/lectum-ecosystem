import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type { AuthorResult } from "./community-feed";
import type * as CommunityResponse from "./community-response";

process.env.DATABASE_URL ??= "postgresql://lectum:lectum@localhost:5432/lectum_test";
process.env.JWT_SECRET_KEY ??= "lectum-test-jwt-secret-key-32-bytes";

let toAuthorResponse: typeof CommunityResponse.toAuthorResponse;

type ProfileOverrides = Partial<NonNullable<AuthorResult["psychologist_profile"]>>;

const professionalAuthor = ({
  active = true,
  deleted = false,
  profile = {},
  role = "psicologo",
}: {
  active?: boolean;
  deleted?: boolean;
  profile?: ProfileOverrides | null;
  role?: string;
} = {}): AuthorResult => ({
  active,
  avatar: null,
  deleted,
  id: "professional",
  name: "Ana Lima",
  psychologist_profile:
    profile === null
      ? null
      : {
          cfp_verified_at: new Date("2026-01-01T00:00:00.000Z"),
          crp_registration_date: null,
          show_experience_tag: false,
          updatedAt: new Date("2026-08-14T12:00:00Z"),
          crp: "06/123456",
          crp_status: "verificado",
          deleted: false,
          gender: "feminino",
          professional_first_name: "Ana",
          professional_last_name: "Lima",
          published: true,
          subscriptions: [
            {
              id: "subscription",
              source: "admin_grant",
              createdAt: new Date("2026-08-13T12:00:00Z"),
              grant_started_at: null,
            },
          ],
          video_url: "/public/files/profile/video.mp4",
          whatsapp: null,
          ...profile,
        },
  role,
});

describe("community author favorite availability", () => {
  before(async () => {
    ({ toAuthorResponse } = await import("./community-response"));
  });

  it("allows favorites for an available professional profile", () => {
    assert.equal(toAuthorResponse(professionalAuthor()).favorite_available, true);
  });

  it("hides favorites while the professional account is inactive", () => {
    assert.equal(toAuthorResponse(professionalAuthor({ active: false })).favorite_available, false);
  });

  it("hides the top mentor badge while the professional profile is unavailable", () => {
    assert.equal(toAuthorResponse(professionalAuthor(), 80).featured_badge, "TOP #1 MENTOR");
    assert.equal(toAuthorResponse(professionalAuthor({ active: false }), 80).featured_badge, null);
    assert.equal(
      toAuthorResponse(professionalAuthor({ profile: { published: false } }), 80).featured_badge,
      null,
    );
  });

  it("hides favorites for unpublished, deleted or incomplete profiles", () => {
    for (const profile of [
      { published: false },
      { deleted: true },
      { video_url: null },
      { video_url: " " },
    ] satisfies ProfileOverrides[]) {
      assert.equal(toAuthorResponse(professionalAuthor({ profile })).favorite_available, false);
    }
    assert.equal(toAuthorResponse(professionalAuthor({ profile: null })).favorite_available, false);
  });

  it("never offers the professional favorite action to patients", () => {
    assert.equal(
      toAuthorResponse(
        professionalAuthor({
          profile: null,
          role: "paciente",
        }),
      ).favorite_available,
      false,
    );
  });
});
