import { copyFile, mkdir, readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const adminRootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const appServerDir = join(adminRootDir, ".next", "server", "app");
const clientReferenceManifestSuffix = "_client-reference-manifest.js";
const routeGroupPattern = /^\(.+\)$/;

const listDirectory = async (directory) => {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
};

const copyRouteGroupManifest = async ({ copiedFiles, groupSourceDir, sourceFile }) => {
  const relativeManifestPath = relative(groupSourceDir, sourceFile);
  const targetFile = join(appServerDir, relativeManifestPath);

  await mkdir(dirname(targetFile), { recursive: true });
  await copyFile(sourceFile, targetFile);
  copiedFiles.push(relativeManifestPath);
};

const walkRouteGroup = async ({ copiedFiles, directory, groupSourceDir }) => {
  const entries = await listDirectory(directory);

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      await walkRouteGroup({ copiedFiles, directory: entryPath, groupSourceDir });
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(clientReferenceManifestSuffix)) {
      await copyRouteGroupManifest({ copiedFiles, groupSourceDir, sourceFile: entryPath });
    }
  }
};

const syncRouteGroupManifests = async () => {
  const appEntries = await listDirectory(appServerDir);
  const routeGroups = appEntries.filter(
    (entry) => entry.isDirectory() && routeGroupPattern.test(entry.name),
  );
  const copiedFiles = [];

  for (const routeGroup of routeGroups) {
    await walkRouteGroup({
      copiedFiles,
      directory: join(appServerDir, routeGroup.name),
      groupSourceDir: join(appServerDir, routeGroup.name),
    });
  }

  if (copiedFiles.length === 0) {
    console.log("No route group client reference manifests to sync.");
    return;
  }

  console.log(`Synced ${copiedFiles.length} route group client reference manifest(s).`);
};

await syncRouteGroupManifests();
