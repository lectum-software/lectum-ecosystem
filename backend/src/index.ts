import "dotenv/config";

import { prisma } from "@/external/prisma/client";
import { startNotificationDigestScheduler } from "@/main/notification/digests";
import app from "@/main/server/app";
import { env } from "@/main/server/environment";

const server = app.listen(env.PORT, () => {
  console.log(`Backend listening on ${env.BASE}`);
  startNotificationDigestScheduler();
});

const shutdown = async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
