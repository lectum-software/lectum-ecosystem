import { Client } from "pg";

const R2_TO_STREAM_MIGRATION_LOCK = 1_650_904;
const LOCK_HEARTBEAT_MS = 15_000;

export type R2ToStreamMigrationLock = {
  isHealthy: () => boolean;
  release: () => Promise<void>;
};

export const acquireR2ToStreamMigrationLock = async (
  connectionString: string,
): Promise<R2ToStreamMigrationLock | null> => {
  const client = new Client({ connectionString, keepAlive: true });
  let healthy = true;
  let heartbeatInFlight = false;
  client.on("error", () => {
    healthy = false;
  });
  await client.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query<{ acquired: boolean }>(
      "SELECT pg_try_advisory_xact_lock($1) AS acquired",
      [R2_TO_STREAM_MIGRATION_LOCK],
    );
    if (result.rows[0]?.acquired !== true) {
      await client.query("ROLLBACK").catch(() => undefined);
      await client.end();
      return null;
    }
  } catch (error) {
    await client.end().catch(() => undefined);
    throw error;
  }

  const heartbeat = setInterval(() => {
    if (!healthy || heartbeatInFlight) return;
    heartbeatInFlight = true;
    void client
      .query("SELECT 1")
      .catch(() => {
        healthy = false;
      })
      .finally(() => {
        heartbeatInFlight = false;
      });
  }, LOCK_HEARTBEAT_MS);
  heartbeat.unref();

  return {
    isHealthy: () => healthy,
    release: async () => {
      clearInterval(heartbeat);
      await client.query("ROLLBACK").catch(() => undefined);
      await client.end().catch(() => undefined);
    },
  };
};
