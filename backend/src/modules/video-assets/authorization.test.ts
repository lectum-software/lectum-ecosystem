import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canViewVideoAsset } from "./authorization";

describe("video asset playback authorization", () => {
  it("permite o dono mesmo antes da associação pública", () => {
    assert.equal(
      canViewVideoAsset({
        hasPublishedAssociation: false,
        ownerId: "owner-1",
        viewerId: "owner-1",
      }),
      true,
    );
  });

  it("permite terceiro somente com associação publicável", () => {
    assert.equal(
      canViewVideoAsset({
        hasPublishedAssociation: true,
        ownerId: "owner-1",
        viewerId: "viewer-2",
      }),
      true,
    );
    assert.equal(
      canViewVideoAsset({
        hasPublishedAssociation: false,
        ownerId: "owner-1",
        viewerId: "viewer-2",
      }),
      false,
    );
  });
});
