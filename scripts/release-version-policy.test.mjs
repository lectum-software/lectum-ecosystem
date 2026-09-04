import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertAdvancedReleaseVersions,
  assertSynchronizedVersions,
  bumpPatchVersion,
  compareReleaseVersions,
  parseReleaseVersion,
  RELEASE_PACKAGE_PATHS,
} from "./release-version-policy.mjs";

describe("release version policy", () => {
  it("versiona os cinco manifests independentes", () => {
    assert.deepEqual(RELEASE_PACKAGE_PATHS, [
      "package.json",
      "backend/package.json",
      "frontend/package.json",
      "admin/package.json",
      "video/package.json",
    ]);
  });

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

  it("não ignora o bump quando um manifest é adicionado ao release", () => {
    const headVersionsByPath = {
      "admin/package.json": "0.1.259",
      "backend/package.json": "0.1.259",
      "frontend/package.json": "0.1.259",
      "package.json": "0.1.259",
    };

    assert.throws(
      () =>
        assertAdvancedReleaseVersions({
          headVersionsByPath,
          stagedVersionsByPath: {
            ...headVersionsByPath,
            "video/package.json": "0.1.259",
          },
        }),
      /deve subir acima/,
    );
    assert.equal(
      assertAdvancedReleaseVersions({
        headVersionsByPath,
        stagedVersionsByPath: Object.fromEntries(
          [...Object.keys(headVersionsByPath), "video/package.json"].map((manifestPath) => [
            manifestPath,
            "0.1.260",
          ]),
        ),
      }),
      "0.1.260",
    );
  });
});
