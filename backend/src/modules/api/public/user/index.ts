import { Router } from "express";
import { send } from "@/helpers/return";
import prisma from "@/infra/database/prisma";
import storeRoutes from "./store";

const routes = Router();

routes.get("", async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const take = Math.min(Math.max(Number(req.query.take || 20), 1), 100);
  const skip = (page - 1) * take;

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where: { deleted: false },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where: { deleted: false } }),
  ]);

  return send(res, {
    success: true,
    data: {
      items,
      total,
      page,
      take,
    },
  });
});

routes.use("/store", storeRoutes);

export default routes;
