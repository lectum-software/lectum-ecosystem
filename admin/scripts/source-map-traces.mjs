import { readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

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
