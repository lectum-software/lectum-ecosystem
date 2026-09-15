import { runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

await runIsolatedPostgresProbe({
  name: "media-association",
  probeUrl: new URL("./video-asset-association-probe.cjs", import.meta.url),
  expectedChecks: 28,
  successMarker: "VIDEO_ASSET_ASSOCIATION_POSTGRES_OK",
}).catch(() => {
  console.error("VIDEO_ASSET_ASSOCIATION_RUNNER_INVALID");
  process.exitCode = 2;
});
