import { readdir, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const adminRootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const nextBuildDir = join(adminRootDir, ".next");
const inlineSourceMapPattern = /sourceMappingURL\s*=\s*data:/iu;
const inlineCandidateExtensions = [".cjs", ".css", ".html", ".js", ".mjs"];

const findBuildFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findBuildFiles(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
};

const buildFiles = await findBuildFiles(nextBuildDir);
const sourceMaps = buildFiles.filter((file) => file.endsWith(".map"));
await Promise.all(sourceMaps.map((sourceMap) => rm(sourceMap, { force: true })));

const remainingBuildFiles = await findBuildFiles(nextBuildDir);
const remainingSourceMaps = remainingBuildFiles.filter((file) => file.endsWith(".map"));
const inlineCandidates = remainingBuildFiles.filter((file) =>
  inlineCandidateExtensions.some((extension) => file.endsWith(extension)),
);
const hasInlineSourceMap = (
  await Promise.all(
    inlineCandidates.map(async (file) => inlineSourceMapPattern.test(await readFile(file, "utf8"))),
  )
).some(Boolean);

if (remainingSourceMaps.length > 0 || hasInlineSourceMap) {
  throw new Error("Production source map cleanup did not complete.");
}

console.log(`Removed ${sourceMaps.length} production source map file(s).`);
