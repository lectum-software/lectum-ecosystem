import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  assertSynchronizedVersions,
  bumpPatchVersion,
  compareReleaseVersions,
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
  const stagedVersion = assertSynchronizedVersions(versionsFromManifests(stagedManifests));

  let headManifests;
  try {
    headManifests = Object.fromEntries(
      RELEASE_PACKAGE_PATHS.map((manifestPath) => [
        manifestPath,
        readGitManifest("HEAD", manifestPath),
      ]),
    );
  } catch {
    console.log(`[release-version] Commit inicial preparado com versão ${stagedVersion}.`);
    return;
  }

  for (const manifestPath of RELEASE_PACKAGE_PATHS) {
    const headVersion = headManifests[manifestPath].version;
    const nextVersion = stagedManifests[manifestPath].version;
    if (compareReleaseVersions(nextVersion, headVersion) <= 0) {
      throw new Error(
        `${manifestPath} deve subir acima de ${headVersion}. Execute \`pnpm version:bump\` e prepare os quatro manifests.`,
      );
    }
  }

  console.log(`[release-version] OK: commit preparado com versão ${stagedVersion}.`);
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
