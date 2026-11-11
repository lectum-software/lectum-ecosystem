import type { AdminFeeItem } from "@/api/req/finance/fees";
import {
  balanceKindLabel,
  balanceStatusLabel,
  formatFeeDate,
  formatFeeMoney,
} from "../modules/fee-policy";

export const FeeTransactions = ({
  transactions,
}: {
  transactions: AdminFeeItem["transactions"];
}) => (
  <details className="min-w-0 rounded-2xl border border-border bg-surface-muted/30 p-3">
    <summary className="min-h-8 cursor-pointer text-sm font-semibold leading-6 text-primary">
      Movimentos observados ({transactions.length})
    </summary>
    {!transactions.length ? (
      <p className="mt-3 text-xs leading-5 text-muted">
        Nenhum movimento registrado nesta observação. Isso não comprova ausência de ajustes.
      </p>
    ) : (
      <ul className="mt-3 grid min-w-0 gap-3 xl:grid-cols-2">
        {transactions.map((transaction) => (
          <li
            className="min-w-0 space-y-2 rounded-2xl border border-border bg-surface p-3"
            key={transaction.id_local}
          >
            <p className="font-bold text-foreground">{balanceKindLabel(transaction.kind)}</p>
            <p className="text-xs leading-5 text-muted">
              Ocorrência: {formatFeeDate(transaction.occurred_at)} · BRT
            </p>
            <dl className="grid min-w-0 gap-2 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-muted">Valor do movimento</dt>
                <dd className="mt-1 break-words font-semibold text-foreground">
                  {formatFeeMoney(transaction.amount_cents)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Tarifa observada</dt>
                <dd className="mt-1 break-words font-semibold text-foreground">
                  {formatFeeMoney(transaction.fee_cents)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Líquido do movimento</dt>
                <dd className="mt-1 break-words font-semibold text-foreground">
                  {formatFeeMoney(transaction.net_cents)}
                </dd>
              </div>
            </dl>
            <p className="text-xs leading-5 text-muted">{balanceStatusLabel(transaction.status)}</p>
            <p className="text-xs leading-5 text-muted">
              Disponibilidade indicada para: {formatFeeDate(transaction.available_on)} · BRT. Esta
              data não comprova saque ou repasse.
            </p>
          </li>
        ))}
      </ul>
    )}
  </details>
);
