export type VideoRetentionOptions = {
  action: "catalog-r2" | "list";
  apply: boolean;
  confirmation: "homolog" | "production" | null;
  limit: number;
  after?: string;
  reviewAfter?: Date;
};

export const parseVideoRetentionArguments = (argv: string[]): VideoRetentionOptions | null => {
  const flags = new Map<string, string | true>();
  for (const arg of argv) {
    if (arg === "--" && flags.size === 0) continue;
    const match = /^--([a-z][a-z0-9-]*)(?:=(.*))?$/.exec(arg);
    if (!match || flags.has(match[1])) throw new Error("invalid_arguments");
    flags.set(match[1], match[2] ?? true);
  }
  const allowed = new Set([
    "help",
    "catalog-r2",
    "list",
    "apply",
    "dry-run",
    "confirm",
    "limit",
    "after",
    "review-after",
  ]);
  if ([...flags.keys()].some((key) => !allowed.has(key))) throw new Error("invalid_arguments");
  for (const key of ["help", "catalog-r2", "list", "apply", "dry-run"]) {
    if (flags.has(key) && flags.get(key) !== true) throw new Error("invalid_arguments");
  }
  if (flags.has("help") || flags.size === 0) return null;
  if (flags.has("catalog-r2") === flags.has("list")) throw new Error("invalid_arguments");
  if (flags.has("apply") && flags.has("dry-run")) throw new Error("invalid_arguments");
  const action = flags.has("list") ? "list" : "catalog-r2";
  const apply = flags.has("apply");
  const confirmation = flags.get("confirm") ?? null;
  if (apply ? !["homolog", "production"].includes(String(confirmation)) : confirmation !== null) {
    throw new Error("invalid_confirmation");
  }
  const limitRaw = flags.get("limit") ?? "5";
  if (typeof limitRaw !== "string" || !/^\d+$/.test(limitRaw)) throw new Error("invalid_limit");
  const limit = Number(limitRaw);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) throw new Error("invalid_limit");
  const after = flags.get("after");
  if (after !== undefined && (typeof after !== "string" || !/^[a-f0-9]{64}$/.test(after)))
    throw new Error("invalid_cursor");
  const reviewRaw = flags.get("review-after");
  let reviewAfter: Date | undefined;
  if (reviewRaw !== undefined) {
    if (typeof reviewRaw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(reviewRaw))
      throw new Error("invalid_review_date");
    reviewAfter = new Date(`${reviewRaw}T00:00:00.000Z`);
    if (
      !Number.isFinite(reviewAfter.getTime()) ||
      reviewAfter.toISOString().slice(0, 10) !== reviewRaw
    )
      throw new Error("invalid_review_date");
  }
  if (action === "list" && (apply || reviewAfter)) throw new Error("invalid_arguments");
  if (action === "catalog-r2" && after) throw new Error("invalid_arguments");
  return {
    action,
    apply,
    confirmation: confirmation as VideoRetentionOptions["confirmation"],
    limit,
    after: after as string | undefined,
    reviewAfter,
  };
};
