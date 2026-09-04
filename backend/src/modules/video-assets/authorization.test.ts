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

  it("permite qualquer visitante quando há associação pública", () => {
    assert.equal(
      canViewVideoAsset({
        hasPublishedAssociation: true,
        ownerId: "owner-1",
        viewerId: null,
      }),
      true,
    );
    assert.equal(
      canViewVideoAsset({
        hasPublishedAssociation: true,
        ownerId: "owner-1",
      }),
      true,
    );
  });

  it("nega visitante anônimo e terceiro quando não há associação pública", () => {
    assert.equal(
      canViewVideoAsset({
        hasPublishedAssociation: false,
        ownerId: "owner-1",
        viewerId: null,
      }),
      false,
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
