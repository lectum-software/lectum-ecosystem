import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  assertAdvancedReleaseVersions,
  assertSynchronizedVersions,
  bumpPatchVersion,
  RELEASE_PACKAGE_PATHS,
} from "./release-version-policy.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const parseManifest = (content, manifestPath) => {
  const manifest = JSON.parse(content);
  if (typeof manifest.version !== "string") {
    throw new Error(`${manifestPath} não possui uma versão válida.`);
  }

  return manifest;
};

const readWorkingManifests = () =>
  Object.fromEntries(
    RELEASE_PACKAGE_PATHS.map((manifestPath) => {
      const absolutePath = path.join(repositoryRoot, manifestPath);
      return [manifestPath, parseManifest(readFileSync(absolutePath, "utf8"), manifestPath)];
    }),
  );

const readGitManifest = (revision, manifestPath) => {
  try {
    const content = execFileSync("git", ["show", `${revision}:${manifestPath}`], {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return parseManifest(content, manifestPath);
  } catch {
    throw new Error(`Não foi possível ler ${manifestPath} em ${revision}.`);
  }
};

const tryReadGitManifest = (revision, manifestPath) => {
  try {
    return readGitManifest(revision, manifestPath);
  } catch {
    return null;
  }
};

const versionsFromManifests = (manifests) =>
  Object.fromEntries(
    Object.entries(manifests).map(([manifestPath, manifest]) => [manifestPath, manifest.version]),
  );

const checkWorkingVersions = () => {
  const version = assertSynchronizedVersions(versionsFromManifests(readWorkingManifests()));
  console.log(`[release-version] OK: manifests sincronizados em ${version}.`);
};

const bumpWorkingVersions = () => {
  const manifests = readWorkingManifests();
  const currentVersion = assertSynchronizedVersions(versionsFromManifests(manifests));
  const nextVersion = bumpPatchVersion(currentVersion);

  for (const [manifestPath, manifest] of Object.entries(manifests)) {
    manifest.version = nextVersion;
    writeFileSync(
      path.join(repositoryRoot, manifestPath),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
  }

  console.log(`[release-version] ${currentVersion} -> ${nextVersion} em todos os manifests.`);
};

const checkStagedVersions = () => {
  const stagedManifests = Object.fromEntries(
    RELEASE_PACKAGE_PATHS.map((manifestPath) => [
      manifestPath,
      readGitManifest("", manifestPath),
    ]),
  );
  const headManifests = Object.fromEntries(
    RELEASE_PACKAGE_PATHS.flatMap((manifestPath) => {
      const manifest = tryReadGitManifest("HEAD", manifestPath);
      return manifest ? [[manifestPath, manifest]] : [];
    }),
  );
  const stagedVersion = assertAdvancedReleaseVersions({
    headVersionsByPath: versionsFromManifests(headManifests),
    stagedVersionsByPath: versionsFromManifests(stagedManifests),
  });

  const additionCount = RELEASE_PACKAGE_PATHS.length - Object.keys(headManifests).length;
  console.log(
    `[release-version] OK: commit preparado com versão ${stagedVersion}${
      additionCount > 0 ? ` e ${additionCount} novo(s) manifest(s)` : ""
    }.`,
  );
};

const command = process.argv[2];

try {
  if (command === "bump") bumpWorkingVersions();
  else if (command === "check") checkWorkingVersions();
  else if (command === "check-staged") checkStagedVersions();
  else throw new Error("Comando esperado: bump, check ou check-staged.");
} catch (error) {
  const message = error instanceof Error ? error.message : "Falha desconhecida.";
  console.error(`[release-version] ${message}`);
  process.exitCode = 1;
}
