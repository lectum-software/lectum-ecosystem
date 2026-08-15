import { prisma } from "@/external/prisma/client";
import { startBillingDunningScheduler, stopBillingDunningScheduler } from "@/main/billing/dunning";
import {
  startNotificationCampaignScheduler,
  stopNotificationCampaignScheduler,
} from "@/main/notification/campaigns";
import {
  startNotificationDigestScheduler,
  stopNotificationDigestScheduler,
} from "@/main/notification/digests";
import { soc } from "@/main/socket/state";
import { toSafeErrorLog } from "@/utils/safe-error-log";
import app from "./app";
import { env } from "./environment";

const server = app.listen(env.PORT, () => {
  console.log("Backend iniciado.");
  startNotificationDigestScheduler();
  startNotificationCampaignScheduler();
  startBillingDunningScheduler();
});

let shuttingDown = false;

const shutdown = async () => {
  if (shuttingDown) return;
  shuttingDown = true;

  stopNotificationCampaignScheduler();
  stopNotificationDigestScheduler();
  stopBillingDunningScheduler();
  soc?.disconnectSockets(true);

  const forceCloseTimer = setTimeout(() => {
    server.closeAllConnections();
  }, 10_000);

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error && (error as NodeJS.ErrnoException).code !== "ERR_SERVER_NOT_RUNNING") {
          reject(error);
          return;
        }

        resolve();
      });
      server.closeIdleConnections();
    });
    await prisma.$disconnect();
    process.exitCode = 0;
  } catch (error) {
    console.error("[SHUTDOWN] Falha ao encerrar a API com segurança.", {
      ...toSafeErrorLog(error, "UnknownShutdownError"),
    });
    process.exitCode = 1;
  } finally {
    clearTimeout(forceCloseTimer);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
