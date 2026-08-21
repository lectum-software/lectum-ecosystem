import { readdir, readFile, rm } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const nextBuildDir = join(frontendRootDir, ".next");
const staleDevelopmentDir = join(nextBuildDir, "dev");
const INLINE_SOURCE_MAP_PATTERN = /sourceMappingURL\s*=\s*data:/iu;
const SOURCE_ARTIFACT_EXTENSIONS = new Set([".cjs", ".css", ".html", ".js", ".mjs"]);

const listFiles = async (directory, { skipBuildCache = false } = {}) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (skipBuildCache && directory === nextBuildDir && entry.name === "cache") continue;

    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath, { skipBuildCache })));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
};

// `next build` can coexist with a stale local `.next/dev`; it is never a
// production artifact and must not weaken the production verification below.
await rm(staleDevelopmentDir, { force: true, recursive: true });

const generatedFiles = await listFiles(nextBuildDir);
const sourceMaps = generatedFiles.filter((file) => file.endsWith(".map"));
await Promise.all(sourceMaps.map((sourceMap) => rm(sourceMap, { force: true })));

const remainingFiles = await listFiles(nextBuildDir, { skipBuildCache: true });
if (remainingFiles.some((file) => file.endsWith(".map"))) {
  throw new Error("Production source map cleanup did not complete.");
}

for (const file of remainingFiles) {
  if (!SOURCE_ARTIFACT_EXTENSIONS.has(extname(file))) continue;
  const contents = await readFile(file, "utf8");
  if (INLINE_SOURCE_MAP_PATTERN.test(contents)) {
    throw new Error("Inline production source maps remain after cleanup.");
  }
}

console.log(`Removed ${sourceMaps.length} production source map file(s); inline maps: none.`);
