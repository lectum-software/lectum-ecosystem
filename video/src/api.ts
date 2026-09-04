import "dotenv/config";
import { createServer } from "node:http";
import { createVideoApi } from "./app.js";
import { parseVideoServiceConfig } from "./config/env.js";
import { logError, logInfo } from "./http/logging.js";
import { createRedisConnection, createVideoQueue } from "./infra/queue/client.js";
import { ensureVideoStorage } from "./infra/storage/storage.js";

const main = async () => {
  const config = parseVideoServiceConfig(process.env);
  const connection = createRedisConnection(config, "api");
  await connection.connect();
  const queue = createVideoQueue(config, connection);
  await queue.waitUntilReady();
  await ensureVideoStorage(config);

  const app = createVideoApi({ config, connection, queue });
  const server = createServer(app);
  server.headersTimeout = config.uploadRequestTimeoutMs + 10_000;
  server.requestTimeout = config.uploadRequestTimeoutMs;
  server.keepAliveTimeout = 5_000;

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logInfo("video_api_shutdown_started");

    const forceExit = setTimeout(() => {
      logError("video_api_shutdown_timeout", { error_code: "shutdown_timeout" });
      process.exit(1);
    }, config.gracefulShutdownMs);
    forceExit.unref();

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await Promise.allSettled([queue.close(), connection.quit()]);
    clearTimeout(forceExit);
    logInfo("video_api_shutdown_completed");
  };

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());

  server.listen(config.port, config.host, () => {
    logInfo("video_api_started", { operation: "listen", status: "ready" });
  });
};

main().catch(() => {
  logError("video_api_start_failed", { error_code: "startup_failed" });
  process.exitCode = 1;
});
