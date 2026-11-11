export class FiscalRecoveryError extends Error {
  constructor() {
    super("FISCAL_RECOVERY_BLOCKED");
    this.name = "FiscalRecoveryError";
  }
}
const REASONS = ["provider_recovered", "configuration_corrected", "missing_fiscal_job"] as const;
export type FiscalRecoveryArguments = {
  invoiceId: string;
  accountId: string;
  mode: "test" | "live";
  actorAdminId: string;
  expectedJobAttempts: number | null;
  expectedInvoiceAttempts: number | null;
  reason: (typeof REASONS)[number];
  apply: boolean;
  confirm?: "test" | "live";
};
export const validateFiscalRecoveryArguments = (args: FiscalRecoveryArguments) => {
  if (
    !/^in_[A-Za-z0-9]{1,100}$/.test(args.invoiceId) ||
    !/^acct_[A-Za-z0-9]{1,100}$/.test(args.accountId) ||
    !["test", "live"].includes(args.mode) ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(args.actorAdminId) ||
    ![args.expectedJobAttempts, args.expectedInvoiceAttempts].every(
      (value) =>
        value === null || (Number.isSafeInteger(value) && value >= 0 && value < 2_147_483_647),
    ) ||
    !REASONS.includes(args.reason) ||
    typeof args.apply !== "boolean" ||
    (args.confirm !== undefined && args.confirm !== args.mode) ||
    (args.apply && args.confirm !== args.mode)
  )
    throw new FiscalRecoveryError();
};
export const parseFiscalRecoveryArguments = (argv: string[]): FiscalRecoveryArguments | null => {
  if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) return null;
  const flags = new Map<string, string | true>();
  const permitted = new Set([
    "--invoice-id",
    "--account",
    "--mode",
    "--actor-admin-id",
    "--expected-job-attempts",
    "--expected-invoice-attempts",
    "--reason",
    "--confirm",
  ]);
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flags.has(flag)) throw new FiscalRecoveryError();
    if (flag === "--apply") flags.set(flag, true);
    else {
      if (!permitted.has(flag)) throw new FiscalRecoveryError();
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new FiscalRecoveryError();
      flags.set(flag, value);
    }
  }
  const string = (key: string) => {
    const value = flags.get(key);
    if (typeof value !== "string") throw new FiscalRecoveryError();
    return value;
  };
  const attempts = (key: string) => {
    const value = string(key);
    if (value === "absent") return null;
    if (!/^(0|[1-9]\d{0,9})$/.test(value)) throw new FiscalRecoveryError();
    return Number(value);
  };
  const args = {
    invoiceId: string("--invoice-id"),
    accountId: string("--account"),
    mode: string("--mode") as FiscalRecoveryArguments["mode"],
    actorAdminId: string("--actor-admin-id"),
    expectedJobAttempts: attempts("--expected-job-attempts"),
    expectedInvoiceAttempts: attempts("--expected-invoice-attempts"),
    reason: string("--reason") as FiscalRecoveryArguments["reason"],
    apply: flags.has("--apply"),
    ...(flags.has("--confirm") ? { confirm: string("--confirm") as "test" | "live" } : {}),
  };
  validateFiscalRecoveryArguments(args);
  return args;
};
