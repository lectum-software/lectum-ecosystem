export function isDirectoryPlayerPoolEnabled(search: string) {
  return new URLSearchParams(search).get("directoryPlayer") !== "individual";
}

export function preserveDirectoryExperiment(target: URLSearchParams, search: string) {
  const source = new URLSearchParams(search);
  const mode = source.get("directoryPlayer");
  if (mode === "pooled" || mode === "individual") target.set("directoryPlayer", mode);
  if (source.get("videoDiagnostics") === "1") target.set("videoDiagnostics", "1");
  return target;
}
