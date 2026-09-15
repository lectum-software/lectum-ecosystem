// Manual: real private router/authentication + immutable image and disposable PostgreSQL.
import { runIsolatedPostgresProbe } from "./isolated-postgres-runner.mjs";

await runIsolatedPostgresProbe({
  name: "upload-diagnostics",
  probeUrl: new URL("./video-upload-diagnostics-http-probe.cjs", import.meta.url),
  expectedChecks: 20,
  successMarker: "VIDEO_UPLOAD_DIAGNOSTICS_HTTP_POSTGRES_OK",
}).catch(() => {
  console.error("ISOLATED_POSTGRES_RUNNER_INVALID");
  process.exitCode = 2;
});
