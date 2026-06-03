import prisma from "@/infra/database/prisma";
import { notify } from "@/main/notification";

// Dispara uma notificação de teste para todos os usuários (dev only).
// Usa o dispatcher real: persiste `notification`, emite Socket.IO e envia push
// para quem tiver `notification_subscription` + VAPID.
export default async () => {
  const users = await prisma.user.findMany({
    where: { deleted: false },
    select: { id: true },
  });

  const ids = users.map((user) => user.id);

  await notify(ids, {
    message_key: "test",
    message_props: { name: "Lectum" },
    redirect: "/app/notifications",
  });

  return {
    status: 200,
    success: true,
    message: "Notificação de teste disparada",
    data: { dispatched: ids.length },
  };
};
