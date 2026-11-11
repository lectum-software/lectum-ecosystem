import { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { getInvoiceConfig } from "@/modules/billing/invoices/config";
import { invoiceGatewayScopes } from "@/modules/billing/invoices/gateway-scope";
import type { AdminFinanceHistoryQuery } from "../DTOs/IAdminFinanceHistoryDTO";
import { contractSelect, type HistoryContext, type HistoryRecords } from "./records";

export const HISTORY_SCAN_LIMIT = 10_000;
export class HistoryFilterRequiredError extends Error {
  constructor() {
    super("FINANCE_HISTORY_FILTER_REQUIRED");
  }
}
export function assertHistoryScanSize(size: number) {
  if (size > HISTORY_SCAN_LIMIT) throw new HistoryFilterRequiredError();
}

export function readHistoryContext(env = process.env): HistoryContext {
  let fiscal: HistoryContext["fiscal"] = null;
  try {
    const config = getInvoiceConfig(env);
    if (config) fiscal = { companyId: config.companyId, mode: config.mode };
  } catch {
    /* Configuration absence must not hide financial receipts. No provider call. */
  }
  return {
    scopes: [...invoiceGatewayScopes("test", env), ...invoiceGatewayScopes("live", env)],
    fiscal,
    now: new Date(),
  };
}

export const historyDateRange = (query: AdminFinanceHistoryQuery) => ({
  ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000-03:00`) } : {}),
  ...(query.to
    ? { lt: new Date(new Date(`${query.to}T00:00:00.000-03:00`).getTime() + 86_400_000) }
    : {}),
});

export class AdminFinanceHistoryRepository {
  async read(query: AdminFinanceHistoryQuery, context: HistoryContext): Promise<HistoryRecords> {
    return prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        return readHistoryRecords(tx, query, context);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 20_000 },
    );
  }
}

/** Complete local snapshot or an explicit filter-required error: never silently slice source rows. */
export async function readHistoryRecords(
  tx: Prisma.TransactionClient,
  query: AdminFinanceHistoryQuery,
  context: HistoryContext,
): Promise<HistoryRecords> {
  const q = query.q?.trim();
  const contracts = await tx.professional_subscription.findMany({
    where: {
      deleted: false,
      AND: [
        {
          OR: [
            { gateway: "stripe", source: "stripe" },
            { gateway: "mercadopago", source: "mercadopago" },
            { gateway: null, source: "mercadopago" },
          ],
        },
        ...(q
          ? [
              {
                OR: [
                  { id: { contains: q, mode: "insensitive" as const } },
                  { psychologist_id: { contains: q, mode: "insensitive" as const } },
                  {
                    psychologist: {
                      user: {
                        OR: [
                          { id: { contains: q, mode: "insensitive" as const } },
                          { name: { contains: q, mode: "insensitive" as const } },
                        ],
                      },
                    },
                  },
                ],
              },
            ]
          : []),
      ],
      psychologist: {
        deleted: false,
        user: { deleted: false },
        ...(query.user_id ? { user_id: query.user_id } : {}),
      },
    },
    select: contractSelect,
    take: HISTORY_SCAN_LIMIT + 1,
    orderBy: { id: "asc" },
  });
  assertHistoryScanSize(contracts.length);
  if (!contracts.length)
    return { ambiguousReferences: [], contracts, receipts: [], events: [], invoices: [] };
  const range = historyDateRange(query);
  const ids = contracts.map((row) => row.id);
  const stripeScopes = context.scopes.filter((scope) => scope.gateway === "stripe");
  const receipts = stripeScopes.length
    ? await tx.billing_financial_receipt.findMany({
        where: {
          subscription_id: { in: ids },
          paid_at: range,
          OR: stripeScopes.map((scope) => ({
            gateway: "stripe",
            mode: scope.mode,
            account_id: scope.accountId,
          })),
        },
        take: HISTORY_SCAN_LIMIT + 1,
        orderBy: [{ paid_at: "desc" }, { id: "desc" }],
      })
    : [];
  assertHistoryScanSize(receipts.length);
  const references = contracts
    .filter((row) => row.source === "mercadopago")
    .flatMap((row) =>
      [row.id, row.gateway_subscription_id].filter((id): id is string => Boolean(id)),
    );
  // Provider references are not unique in the legacy schema. Resolve ambiguity against
  // every persisted MP contract, not only the current user/search/deletion filter.
  const referenceContracts = references.length
    ? await tx.professional_subscription.findMany({
        where: {
          source: "mercadopago",
          AND: [
            { OR: [{ gateway: "mercadopago" }, { gateway: null }] },
            { OR: [{ id: { in: references } }, { gateway_subscription_id: { in: references } }] },
          ],
        },
        select: { id: true, gateway_subscription_id: true },
        take: HISTORY_SCAN_LIMIT + 1,
      })
    : [];
  assertHistoryScanSize(referenceContracts.length);
  const referenceOwners = new Map<string, Set<string>>();
  const allowedReferences = new Set(references);
  for (const contract of referenceContracts) {
    for (const reference of [contract.id, contract.gateway_subscription_id]) {
      if (!reference || !allowedReferences.has(reference)) continue;
      const owners = referenceOwners.get(reference) ?? new Set<string>();
      owners.add(contract.id);
      referenceOwners.set(reference, owners);
    }
  }
  const ambiguousReferences = [...referenceOwners]
    .filter(([, owners]) => owners.size > 1)
    .map(([reference]) => reference);
  // SQL prefilter is not authorization. The strict explicit-reference policy runs again below.
  // Broad scalar matching supports nested/whitespace-padded legacy references; strict policy below
  // rejects descriptions, substrings and conflicting ownership before projecting any row.
  const events = references.length
    ? await tx.$queryRaw<HistoryRecords["events"]>(Prisma.sql`
    SELECT id, internal_id, deleted, deleted_at AS "deletedAt", updated_at AS "updatedAt",
      created_at AS "createdAt", gateway, external_id, type, payload
    FROM payment_events e
    WHERE e.deleted = false AND e.gateway = 'mercadopago'
      ${range.gte ? Prisma.sql`AND e.created_at >= ${range.gte}` : Prisma.empty}
      ${range.lt ? Prisma.sql`AND e.created_at < ${range.lt}` : Prisma.empty}
      AND EXISTS (SELECT 1 FROM unnest(${references}::text[]) AS r(reference)
        WHERE position(r.reference IN e.payload::text) > 0)
    ORDER BY e.created_at DESC, e.id DESC LIMIT ${HISTORY_SCAN_LIMIT + 1}
  `)
    : [];
  assertHistoryScanSize(events.length);
  const invoices = context.fiscal
    ? await tx.billing_invoice.findMany({
        where: {
          subscription_id: { in: ids },
          ...(query.user_id ? { user_id: query.user_id } : {}),
          company_id: context.fiscal.companyId,
          mode: context.fiscal.mode,
          paid_at: range,
          OR: context.scopes
            .filter((scope) => scope.mode === context.fiscal!.mode)
            .map((scope) => ({
              gateway: scope.gateway,
              account_id: scope.accountId,
              mode: scope.mode,
            })),
        },
        take: HISTORY_SCAN_LIMIT + 1,
        orderBy: [{ paid_at: "desc" }, { id: "desc" }],
      })
    : [];
  assertHistoryScanSize(invoices.length);
  return { ambiguousReferences, contracts, receipts, events, invoices };
}
