import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertSynchronizedVersions,
  bumpPatchVersion,
  compareReleaseVersions,
  parseReleaseVersion,
} from "./release-version-policy.mjs";

describe("release version policy", () => {
  it("aceita somente versões de release no formato MAJOR.MINOR.PATCH", () => {
    assert.deepEqual(parseReleaseVersion("1.24.3"), { major: 1, minor: 24, patch: 3 });
    assert.throws(() => parseReleaseVersion("v1.24.3"), /Versão inválida/);
    assert.throws(() => parseReleaseVersion("1.24"), /Versão inválida/);
  });

  it("incrementa somente o patch", () => {
    assert.equal(bumpPatchVersion("0.1.0"), "0.1.1");
    assert.equal(bumpPatchVersion("2.9.99"), "2.9.100");
  });

  it("compara versões numericamente", () => {
    assert.equal(compareReleaseVersions("0.2.0", "0.1.99"), 1);
    assert.equal(compareReleaseVersions("1.0.0", "1.0.0"), 0);
    assert.equal(compareReleaseVersions("1.0.0", "2.0.0"), -1);
  });

  it("rejeita manifests dessincronizados", () => {
    assert.equal(
      assertSynchronizedVersions({ "package.json": "0.1.1", "backend/package.json": "0.1.1" }),
      "0.1.1",
    );
    assert.throws(
      () =>
        assertSynchronizedVersions({
          "package.json": "0.1.1",
          "backend/package.json": "0.1.0",
        }),
      /Versões dessincronizadas/,
    );
  });
});
