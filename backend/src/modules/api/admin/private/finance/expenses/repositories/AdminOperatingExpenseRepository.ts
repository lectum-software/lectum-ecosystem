import { type admin_operating_expense, Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { getPrismaErrorCode, withSerializableTransaction } from "@/utils/prisma-transaction";
import type { ExpensePayload, ExpenseQuery } from "../DTOs/IAdminOperatingExpenseDTO";
import {
  ExpenseError,
  expenseAuditSnapshot,
  expenseCreationFingerprint,
  expenseData,
  toExpenseSqlDate,
} from "../use-cases/policy";

export const expenseWhere = (query: ExpenseQuery): Prisma.admin_operating_expenseWhereInput => ({
  deleted: false,
  ...(query.status !== "all" ? { status: query.status } : {}),
  ...(query.category ? { category: query.category } : {}),
  ...(query.search ? { description: { contains: query.search, mode: "insensitive" } } : {}),
  ...(query.competence_from || query.competence_to
    ? {
        competence_date: {
          ...(query.competence_from ? { gte: toExpenseSqlDate(query.competence_from) } : {}),
          ...(query.competence_to ? { lte: toExpenseSqlDate(query.competence_to) } : {}),
        },
      }
    : {}),
});
async function actor(tx: Prisma.TransactionClient, actorId: string) {
  if (typeof actorId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(actorId))
    throw new ExpenseError("expense_actor_invalid");
  const found = await tx.admin.findFirst({
    where: { id: actorId, active: true, deleted: false, confirmed: true, need_reset: false },
    select: { id: true },
  });
  if (!found) throw new ExpenseError("expense_actor_invalid");
}
async function audit(
  tx: Prisma.TransactionClient,
  actorId: string,
  action: string,
  after: admin_operating_expense,
  before?: admin_operating_expense,
) {
  await tx.admin_activity_log.create({
    data: {
      admin_id: actorId,
      target_type: "admin_operating_expense",
      target_id: after.id,
      domain: "finance",
      action,
      source: "admin_panel",
      reason: "manual_expense_management",
      changed_fields:
        action === "operating_expense_voided"
          ? ["status", "revision", "void_reason", "voided_at", "voided_by_admin_id"]
          : [
              "amount_cents",
              "category",
              "description",
              "competence_date",
              "paid_date",
              "revision",
              ...(before ? ["correction_reason"] : []),
            ],
      ...(before ? { safe_before: expenseAuditSnapshot(before) } : {}),
      safe_after: expenseAuditSnapshot(after),
      metadata: { source: "manual_local_records", financial_actions_executed: false },
    },
  });
}
function replay(row: admin_operating_expense, fingerprint: string) {
  if (row.deleted) throw new ExpenseError("expense_conflict");
  if (row.creation_fingerprint !== fingerprint) throw new ExpenseError("expense_replay_conflict");
  return { row, replayed: true };
}
async function editable(tx: Prisma.TransactionClient, id: string, expectedRevision: number) {
  const row = await tx.admin_operating_expense.findFirst({ where: { id, deleted: false } });
  if (!row) throw new ExpenseError("expense_not_found");
  if (row.status !== "active") throw new ExpenseError("expense_voided");
  if (row.revision !== expectedRevision) throw new ExpenseError("expense_conflict");
  return row;
}

export class AdminOperatingExpenseRepository {
  async create(actorId: string, payload: ExpensePayload, requestKey: string) {
    const fingerprint = expenseCreationFingerprint(actorId, payload);
    try {
      return await withSerializableTransaction(async (tx) => {
        await actor(tx, actorId);
        const existing = await tx.admin_operating_expense.findUnique({
          where: {
            created_by_admin_id_request_key: {
              created_by_admin_id: actorId,
              request_key: requestKey,
            },
          },
        });
        if (existing) return replay(existing, fingerprint);
        const row = await tx.admin_operating_expense.create({
          data: {
            ...expenseData(payload),
            currency: "BRL",
            created_by_admin_id: actorId,
            updated_by_admin_id: actorId,
            request_key: requestKey,
            creation_fingerprint: fingerprint,
          },
        });
        await audit(tx, actorId, "operating_expense_created", row);
        return { row, replayed: false };
      });
    } catch (cause) {
      if (getPrismaErrorCode(cause) !== "P2002") throw cause;
      return withSerializableTransaction(async (tx) => {
        await actor(tx, actorId);
        const existing = await tx.admin_operating_expense.findUnique({
          where: {
            created_by_admin_id_request_key: {
              created_by_admin_id: actorId,
              request_key: requestKey,
            },
          },
        });
        if (!existing) throw cause;
        return replay(existing, fingerprint);
      });
    }
  }
  async correct(
    actorId: string,
    id: string,
    expectedRevision: number,
    payload: ExpensePayload,
    reason: string,
  ) {
    return withSerializableTransaction(async (tx) => {
      await actor(tx, actorId);
      const before = await editable(tx, id, expectedRevision);
      const updated = await tx.admin_operating_expense.updateMany({
        where: { id, deleted: false, status: "active", revision: expectedRevision },
        data: {
          ...expenseData(payload),
          updated_by_admin_id: actorId,
          correction_reason: reason,
          revision: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new ExpenseError("expense_conflict");
      const row = await tx.admin_operating_expense.findUniqueOrThrow({ where: { id } });
      await audit(tx, actorId, "operating_expense_corrected", row, before);
      return row;
    });
  }
  async void(actorId: string, id: string, expectedRevision: number, reason: string) {
    return withSerializableTransaction(async (tx) => {
      await actor(tx, actorId);
      const before = await editable(tx, id, expectedRevision);
      const updated = await tx.admin_operating_expense.updateMany({
        where: { id, deleted: false, status: "active", revision: expectedRevision },
        data: {
          status: "voided",
          updated_by_admin_id: actorId,
          void_reason: reason,
          voided_at: new Date(),
          voided_by_admin_id: actorId,
          revision: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new ExpenseError("expense_conflict");
      const row = await tx.admin_operating_expense.findUniqueOrThrow({ where: { id } });
      await audit(tx, actorId, "operating_expense_voided", row, before);
      return row;
    });
  }
  async read(actorId: string, query: ExpenseQuery) {
    return prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        await actor(tx, actorId);
        return readExpenseSnapshot(tx, query);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 20000 },
    );
  }
}
/** Sequential reads on one repeatable-read connection: rows/count/totals share the exact same predicate. */
export async function readExpenseSnapshot(tx: Prisma.TransactionClient, query: ExpenseQuery) {
  const where = expenseWhere(query);
  const total = await tx.admin_operating_expense.count({ where });
  const page = Math.min(query.page, Math.max(1, Math.ceil(total / query.limit)));
  const rows = await tx.admin_operating_expense.findMany({
    where,
    orderBy: [{ competence_date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * query.limit,
    take: query.limit,
  });
  const active = await tx.admin_operating_expense.aggregate({
    where: { AND: [where, { status: "active" }] },
    _sum: { amount_cents: true },
    _count: { _all: true },
  });
  const paid = await tx.admin_operating_expense.aggregate({
    where: { AND: [where, { status: "active", paid_date: { not: null } }] },
    _sum: { amount_cents: true },
    _count: { _all: true },
  });
  const voided = await tx.admin_operating_expense.aggregate({
    where: { AND: [where, { status: "voided" }] },
    _sum: { amount_cents: true },
    _count: { _all: true },
  });
  return { rows, total, page, active, paid, voided };
}
