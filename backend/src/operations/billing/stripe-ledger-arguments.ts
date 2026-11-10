import {
  FinancialLedgerError,
  type FinancialReconcileOptions,
  validateFinancialOptions,
} from "@/modules/billing/stripe/financial-ledger/policy";

export const parseStripeLedgerArguments = (argv: string[]): FinancialReconcileOptions | null => {
  if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) return null;
  const values = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (values.has(flag)) throw new FinancialLedgerError("invalid_arguments");
    if (["--apply", "--refresh"].includes(flag)) values.set(flag, true);
    else if (
      ["--subscription-id", "--account", "--mode", "--confirm", "--max-pages"].includes(flag)
    ) {
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new FinancialLedgerError("invalid_arguments");
      values.set(flag, value);
    } else throw new FinancialLedgerError("invalid_arguments");
  }
  const subscriptionId = values.get("--subscription-id");
  const accountId = values.get("--account");
  const mode = values.get("--mode");
  const confirm = values.get("--confirm");
  const pages = values.get("--max-pages") ?? "1";
  if (
    typeof subscriptionId !== "string" ||
    typeof accountId !== "string" ||
    (mode !== "test" && mode !== "live") ||
    (confirm !== undefined && confirm !== "test" && confirm !== "live") ||
    typeof pages !== "string" ||
    !/^[1-5]$/.test(pages)
  )
    throw new FinancialLedgerError("invalid_arguments");
  const options: FinancialReconcileOptions = {
    subscriptionId,
    accountId,
    mode,
    confirm,
    apply: values.has("--apply"),
    refresh: values.has("--refresh"),
    maxPages: Number(pages),
  };
  validateFinancialOptions(options);
  return options;
};
