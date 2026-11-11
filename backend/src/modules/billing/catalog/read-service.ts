import prisma from "@/infra/database/prisma";
import { CatalogError, catalogScope, safeCatalogOperation, safeCatalogVersion } from "./policy";
import { catalogActor, catalogContext } from "./repository";

export async function listCatalogRecords(
  actorId: string,
  type: "prices" | "operations",
  cursor?: string,
  limit = 10,
) {
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    (cursor && !/^[A-Za-z0-9_-]{1,128}$/.test(cursor))
  )
    throw new CatalogError("catalog_invalid_input");
  const scope = catalogScope();
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      await catalogActor(tx, actorId);
      const context = await catalogContext(tx, scope);
      const pagination = {
        take: limit + 1,
        orderBy: [{ created_at: "desc" as const }, { id: "desc" as const }],
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      };
      if (type === "prices") {
        if (
          cursor &&
          !(await tx.billing_price_version.findFirst({ where: { id: cursor, ...context.where } }))
        )
          throw new CatalogError("catalog_invalid_input");
        const rows = await tx.billing_price_version.findMany({
          where: context.where,
          ...pagination,
        });
        return {
          items: rows
            .slice(0, limit)
            .map((row) => safeCatalogVersion(row, context.offer?.price_version_id)),
          next_cursor: rows.length > limit ? rows[limit - 1].id : null,
        };
      }
      if (
        cursor &&
        !(await tx.billing_catalog_operation.findFirst({ where: { id: cursor, ...context.where } }))
      )
        throw new CatalogError("catalog_invalid_input");
      const rows = await tx.billing_catalog_operation.findMany({
        where: context.where,
        ...pagination,
      });
      return {
        items: rows.slice(0, limit).map((row) => safeCatalogOperation(row, actorId)),
        next_cursor: rows.length > limit ? rows[limit - 1].id : null,
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
