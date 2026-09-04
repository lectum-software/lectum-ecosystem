import path from "node:path";

const JOB_ID_PATTERN = /^[a-z][a-z0-9]{23,31}$/;

export const isVideoJobId = (value: unknown): value is string =>
  typeof value === "string" && JOB_ID_PATTERN.test(value);

export const requireVideoJobId = (value: unknown): string => {
  if (!isVideoJobId(value)) throw new Error("video_job_id_invalid");
  return value;
};

export type VideoStoragePaths = {
  incomingDirectory: string;
  inputPath: string;
  outputDirectory: string;
  outputPath: string;
  temporaryOutputPath: string;
};

export const assertPathInsideStorage = (storageRoot: string, candidate: string) => {
  const canonicalRoot = path.resolve(storageRoot);
  const canonicalCandidate = path.resolve(candidate);
  const relative = path.relative(canonicalRoot, canonicalCandidate);

  if (!relative || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return canonicalCandidate;
  }

  throw new Error("video_storage_path_invalid");
};

export const videoStoragePaths = (storageRoot: string, rawJobId: unknown): VideoStoragePaths => {
  const jobId = requireVideoJobId(rawJobId);
  const incomingDirectory = assertPathInsideStorage(
    storageRoot,
    path.join(storageRoot, "incoming", jobId),
  );
  const outputDirectory = assertPathInsideStorage(
    storageRoot,
    path.join(storageRoot, "outputs", jobId),
  );

  return {
    incomingDirectory,
    inputPath: assertPathInsideStorage(storageRoot, path.join(incomingDirectory, "source")),
    outputDirectory,
    outputPath: assertPathInsideStorage(storageRoot, path.join(outputDirectory, "video.mp4")),
    temporaryOutputPath: assertPathInsideStorage(
      storageRoot,
      path.join(outputDirectory, "video.partial.mp4"),
    ),
  };
};
