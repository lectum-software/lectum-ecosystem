import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  access,
  mkdir,
  open,
  readdir,
  rename,
  rm,
  stat,
  statfs,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import type { VideoServiceConfig } from "../../config/env.js";
import { assertPathInsideStorage, videoStoragePaths } from "./paths.js";

const STORAGE_DIRECTORIES = ["incoming", "outputs"] as const;

export const ensureVideoStorage = async (config: VideoServiceConfig) => {
  await mkdir(config.storageRoot, { mode: 0o700, recursive: true });
  for (const directory of STORAGE_DIRECTORIES) {
    await mkdir(
      assertPathInsideStorage(config.storageRoot, path.join(config.storageRoot, directory)),
      {
        mode: 0o700,
        recursive: true,
      },
    );
  }

  const probePath = assertPathInsideStorage(
    config.storageRoot,
    path.join(config.storageRoot, `.write-probe-${process.pid}-${randomUUID()}`),
  );
  await writeFile(probePath, "ok", { flag: "wx", mode: 0o600 });
  await rm(probePath, { force: true });
};

export const availableStorageBytes = async (storageRoot: string) => {
  const information = await statfs(storageRoot, { bigint: true });
  const available = information.bavail * information.bsize;
  return available > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(available);
};

export const assertStorageCapacity = async (config: VideoServiceConfig) => {
  const available = await availableStorageBytes(config.storageRoot);
  const required = config.maxInputBytes + config.maxOutputBytes + config.minFreeSpaceBytes;
  if (available < required) throw new Error("video_storage_capacity_exhausted");
};

export const prepareVideoInput = async (config: VideoServiceConfig, jobId: string) => {
  const paths = videoStoragePaths(config.storageRoot, jobId);
  await mkdir(paths.incomingDirectory, { mode: 0o700, recursive: false });
  return paths;
};

export const prepareVideoOutput = async (config: VideoServiceConfig, jobId: string) => {
  const paths = videoStoragePaths(config.storageRoot, jobId);
  await mkdir(paths.outputDirectory, { mode: 0o700, recursive: true });
  await rm(paths.temporaryOutputPath, { force: true });
  return paths;
};

export const publishVideoOutput = async (config: VideoServiceConfig, jobId: string) => {
  const paths = videoStoragePaths(config.storageRoot, jobId);
  await rename(paths.temporaryOutputPath, paths.outputPath);
  return paths.outputPath;
};

export const removeVideoInput = async (config: VideoServiceConfig, jobId: string) => {
  const { incomingDirectory } = videoStoragePaths(config.storageRoot, jobId);
  await rm(incomingDirectory, { force: true, recursive: true });
};

export const removeVideoOutput = async (config: VideoServiceConfig, jobId: string) => {
  const { outputDirectory } = videoStoragePaths(config.storageRoot, jobId);
  await rm(outputDirectory, { force: true, recursive: true });
};

export const removeVideoJobStorage = async (config: VideoServiceConfig, jobId: string) => {
  await Promise.allSettled([removeVideoInput(config, jobId), removeVideoOutput(config, jobId)]);
};

export const videoOutputStat = async (config: VideoServiceConfig, jobId: string) => {
  const { outputPath } = videoStoragePaths(config.storageRoot, jobId);
  const information = await stat(outputPath);
  if (!information.isFile() || information.size <= 0) throw new Error("video_output_invalid");
  return { path: outputPath, size: information.size };
};

export const videoInputExists = async (config: VideoServiceConfig, jobId: string) => {
  const { inputPath } = videoStoragePaths(config.storageRoot, jobId);
  return access(inputPath, constants.R_OK).then(
    () => true,
    () => false,
  );
};

const removeExpiredDirectories = async (input: {
  activeJobIds: ReadonlySet<string>;
  directory: "incoming" | "outputs";
  maxAgeMs: number;
  now: number;
  storageRoot: string;
}) => {
  const root = assertPathInsideStorage(
    input.storageRoot,
    path.join(input.storageRoot, input.directory),
  );
  const entries = await readdir(root, { withFileTypes: true });
  let removed = 0;

  for (const entry of entries) {
    if (!entry.isDirectory() || input.activeJobIds.has(entry.name)) continue;

    const candidate = assertPathInsideStorage(input.storageRoot, path.join(root, entry.name));
    const information = await stat(candidate).catch(() => null);
    if (!information || input.now - information.mtimeMs < input.maxAgeMs) continue;

    await rm(candidate, { force: true, recursive: true });
    removed += 1;
  }

  return removed;
};

export const cleanupExpiredVideoStorage = async (input: {
  activeJobIds: ReadonlySet<string>;
  config: VideoServiceConfig;
  now?: number;
}) => {
  const now = input.now ?? Date.now();
  const [incoming, outputs] = await Promise.all([
    removeExpiredDirectories({
      activeJobIds: input.activeJobIds,
      directory: "incoming",
      maxAgeMs: input.config.staleInputTtlSeconds * 1000,
      now,
      storageRoot: input.config.storageRoot,
    }),
    removeExpiredDirectories({
      activeJobIds: input.activeJobIds,
      directory: "outputs",
      maxAgeMs: input.config.outputTtlSeconds * 1000,
      now,
      storageRoot: input.config.storageRoot,
    }),
  ]);

  return { incoming, outputs };
};

export const lockDownUploadedFile = async (filePath: string) => {
  const handle = await open(filePath, "r+");
  try {
    await handle.chmod(0o600);
    await handle.sync();
  } finally {
    await handle.close();
  }
};
