import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isProfessionalFavoriteAvailable,
  professionalFavoriteAvailableProfileWhere,
  professionalFavoriteAvailableUserWhere,
} from "./professional-favorite-availability";

const professionalAuthor = ({
  active = true,
  deleted = false,
  profile = {},
}: {
  active?: boolean;
  deleted?: boolean;
  profile?: Partial<{
    deleted: boolean;
    published: boolean;
    video_url: string | null;
  }> | null;
} = {}) => ({
  active,
  deleted,
  role: "psicologo",
  psychologist_profile:
    profile === null
      ? null
      : {
          deleted: false,
          published: true,
          video_url: "/public/files/profile/video.mp4",
          ...profile,
        },
});

describe("professional favorite availability", () => {
  it("requires an active account and an available profile", () => {
    assert.equal(isProfessionalFavoriteAvailable(professionalAuthor()), true);
    assert.equal(isProfessionalFavoriteAvailable(professionalAuthor({ active: false })), false);
    assert.equal(isProfessionalFavoriteAvailable(professionalAuthor({ deleted: true })), false);
    assert.equal(isProfessionalFavoriteAvailable(professionalAuthor({ profile: null })), false);
    assert.equal(
      isProfessionalFavoriteAvailable(professionalAuthor({ profile: { published: false } })),
      false,
    );
    assert.equal(
      isProfessionalFavoriteAvailable(professionalAuthor({ profile: { deleted: true } })),
      false,
    );
    assert.equal(
      isProfessionalFavoriteAvailable(professionalAuthor({ profile: { video_url: " " } })),
      false,
    );
  });

  it("builds the same availability filter used by the favorites list", () => {
    const profileWhere = professionalFavoriteAvailableProfileWhere();

    assert.deepEqual(profileWhere, {
      deleted: false,
      published: true,
      video_url: { not: null },
      NOT: [{ video_url: "" }],
    });
    assert.deepEqual(professionalFavoriteAvailableUserWhere(), {
      active: true,
      deleted: false,
      role: "psicologo",
      psychologist_profile: { is: profileWhere },
    });
  });
});
