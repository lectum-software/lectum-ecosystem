export const RELEASE_PACKAGE_PATHS = Object.freeze([
  "package.json",
  "backend/package.json",
  "frontend/package.json",
  "admin/package.json",
  "video/package.json",
]);

const RELEASE_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export const parseReleaseVersion = (value) => {
  const match = RELEASE_VERSION_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Versão inválida: ${value}. Use MAJOR.MINOR.PATCH sem prefixo.`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
};

export const compareReleaseVersions = (left, right) => {
  const leftVersion = parseReleaseVersion(left);
  const rightVersion = parseReleaseVersion(right);

  for (const key of ["major", "minor", "patch"]) {
    const difference = leftVersion[key] - rightVersion[key];
    if (difference !== 0) return Math.sign(difference);
  }

  return 0;
};

export const bumpPatchVersion = (value) => {
  const version = parseReleaseVersion(value);
  return `${version.major}.${version.minor}.${version.patch + 1}`;
};

export const assertSynchronizedVersions = (versionsByPath) => {
  const entries = Object.entries(versionsByPath);
  if (entries.length === 0) throw new Error("Nenhum manifest foi informado para validação.");

  for (const [, version] of entries) parseReleaseVersion(version);

  const expectedVersion = entries[0][1];
  const divergentEntries = entries.filter(([, version]) => version !== expectedVersion);
  if (divergentEntries.length > 0) {
    const details = entries.map(([manifestPath, version]) => `${manifestPath}=${version}`).join(", ");
    throw new Error(`Versões dessincronizadas: ${details}.`);
  }

  return expectedVersion;
};

export const assertAdvancedReleaseVersions = ({ headVersionsByPath, stagedVersionsByPath }) => {
  const stagedVersion = assertSynchronizedVersions(stagedVersionsByPath);
  const headEntries = Object.entries(headVersionsByPath);

  if (headEntries.length === 0) return stagedVersion;

  assertSynchronizedVersions(headVersionsByPath);
  for (const [manifestPath, headVersion] of headEntries) {
    const nextVersion = stagedVersionsByPath[manifestPath];
    if (!nextVersion || compareReleaseVersions(nextVersion, headVersion) <= 0) {
      throw new Error(
        `${manifestPath} deve subir acima de ${headVersion}. Execute \`pnpm version:bump\` e prepare os cinco manifests.`,
      );
    }
  }

  return stagedVersion;
};
