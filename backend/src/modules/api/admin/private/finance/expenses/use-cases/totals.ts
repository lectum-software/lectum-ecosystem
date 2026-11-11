import type { ExpenseList } from "../DTOs/IAdminOperatingExpenseDTO";

type Aggregate = { _sum: { amount_cents: number | null }; _count: { _all: number } };
export function expenseTotals(input: {
  active: Aggregate;
  paid: Aggregate;
  voided: Aggregate;
}): ExpenseList["totals"] {
  const recorded = input.active._sum.amount_cents ?? 0,
    paid = input.paid._sum.amount_cents ?? 0,
    voided = input.voided._sum.amount_cents ?? 0;
  const available =
    [recorded, paid, voided].every((value) => Number.isSafeInteger(value) && value >= 0) &&
    recorded >= paid;
  return {
    available,
    recorded_cents: available ? recorded : null,
    paid_cents: available ? paid : null,
    pending_cents: available ? recorded - paid : null,
    voided_cents: available ? voided : null,
    active_count: input.active._count._all,
    paid_count: input.paid._count._all,
    pending_count: input.active._count._all - input.paid._count._all,
    voided_count: input.voided._count._all,
  };
}
