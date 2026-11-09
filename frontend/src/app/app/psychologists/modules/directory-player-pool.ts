export function preserveDirectoryExperiment(target: URLSearchParams, search: string) {
  const source = new URLSearchParams(search);
  if (source.get("directoryPlayer") === "pooled") target.set("directoryPlayer", "pooled");
  if (source.get("videoDiagnostics") === "1") target.set("videoDiagnostics", "1");
  return target;
}
