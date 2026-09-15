import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveProvisionUploadMethods } from "./upload-methods";

describe("video upload method negotiation", () => {
  for (const size of [1, 62_270_424, 200_000_000, 200_000_001]) {
    it(`prefers only TUS when accepted, including ${size} bytes`, () => {
      assert.deepEqual(
        resolveProvisionUploadMethods({ acceptedUploadMethods: { basic: true, tus: true }, size }),
        ["tus"],
      );
      assert.deepEqual(
        resolveProvisionUploadMethods({ acceptedUploadMethods: { basic: false, tus: true }, size }),
        ["tus"],
      );
    });
  }

  it("retains basic-only compatibility through the exact basic limit", () => {
    for (const size of [1, 62_270_424, 200_000_000]) {
      assert.deepEqual(
        resolveProvisionUploadMethods({
          acceptedUploadMethods: { basic: true, tus: false },
          size,
        }),
        ["basic"],
      );
    }
  });

  it("never provisions basic beyond the provider limit", () => {
    assert.deepEqual(
      resolveProvisionUploadMethods({
        acceptedUploadMethods: { basic: true, tus: false },
        size: 200_000_001,
      }),
      ["tus"],
    );
  });

  it("preserves TUS defaults for absent or unrecognized capabilities", () => {
    for (const acceptedUploadMethods of [undefined, {}, { basic: false, tus: false }]) {
      assert.deepEqual(resolveProvisionUploadMethods({ acceptedUploadMethods, size: 1 }), ["tus"]);
    }
  });
});
