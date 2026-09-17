import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

// O empacotador Vercel consome estes manifests após o postbuild. Mapas já
// removidos não são dependências runtime e não podem permanecer nos traces.
export const pruneRemovedSourceMapsFromTraces = async (buildRoot, buildFiles) => {
  const root = resolve(buildRoot);
  let removed = 0;
  for (const manifest of buildFiles.filter((file) => file.endsWith(".nft.json"))) {
    const trace = JSON.parse(await readFile(manifest, "utf8"));
    if (!Array.isArray(trace.files) || trace.files.some((file) => typeof file !== "string")) {
      throw new Error("Invalid production trace manifest.");
    }
    const files = trace.files.filter((file) => {
      const target = resolve(dirname(manifest), file);
      const inside = relative(root, target);
      const isRemovedBuildMap =
        target.endsWith(".map") &&
        !isAbsolute(inside) &&
        inside !== ".." &&
        !inside.startsWith(`..${sep}`);
      if (isRemovedBuildMap) removed += 1;
      return !isRemovedBuildMap;
    });
    if (files.length !== trace.files.length) {
      await writeFile(manifest, JSON.stringify({ ...trace, files }));
    }
  }
  return removed;
};

// O adapter materializa filePathMap antes do postbuild. Os valores são
// relativos ao repoRoot do Next (não ao diretório da função nem ao cwd).
export const pruneRemovedSourceMapsFromFunctions = async (buildRoot, buildFiles) => {
  const manifests = buildFiles.filter((file) => file.endsWith(`${sep}.vc-config.json`));
  if (manifests.length === 0) return 0;
  const root = resolve(buildRoot);
  const build = JSON.parse(await readFile(join(root, "required-server-files.json"), "utf8"));
  const repoRoot = build.config?.repoRoot;
  if (typeof repoRoot !== "string" || !isAbsolute(repoRoot)) {
    throw new Error("Invalid production adapter root.");
  }
  let removed = 0;
  for (const manifest of manifests) {
    const config = JSON.parse(await readFile(manifest, "utf8"));
    if (config.filePathMap === undefined) continue;
    if (
      !config.filePathMap ||
      typeof config.filePathMap !== "object" ||
      Array.isArray(config.filePathMap) ||
      Object.values(config.filePathMap).some((file) => typeof file !== "string")
    ) {
      throw new Error("Invalid production adapter file map.");
    }
    const removedKeys = new Set();
    const filePathMap = Object.fromEntries(
      Object.entries(config.filePathMap).filter(([key, file]) => {
        const target = resolve(repoRoot, file);
        const inside = relative(root, target);
        const isRemovedBuildMap =
          target.endsWith(".map") &&
          !isAbsolute(inside) &&
          inside !== ".." &&
          !inside.startsWith(`..${sep}`);
        if (isRemovedBuildMap) removedKeys.add(key);
        return !isRemovedBuildMap;
      }),
    );
    if (removedKeys.size === 0) continue;
    const next = { ...config, filePathMap };
    if (
      config.fileHashes &&
      typeof config.fileHashes === "object" &&
      !Array.isArray(config.fileHashes)
    ) {
      next.fileHashes = Object.fromEntries(
        Object.entries(config.fileHashes).filter(([key]) => !removedKeys.has(key)),
      );
    }
    await writeFile(manifest, JSON.stringify(next));
    removed += removedKeys.size;
  }
  return removed;
};

// O adapter Next/Vercel cria links no output antes do postbuild. Remover o
// mapa original não remove esses links; nunca seguir links para apagar alvos.
export const removeBuildSourceMapLinks = async (directory) => {
  let removed = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink() && entry.name.endsWith(".map")) {
      await rm(path, { force: true });
      removed += 1;
    } else if (entry.isDirectory()) {
      removed += await removeBuildSourceMapLinks(path);
    }
  }
  return removed;
};
