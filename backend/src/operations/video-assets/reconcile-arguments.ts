import type { ReconcileVideoUploadOptions } from "@/modules/video-assets/reconciliation/types";

export type { ReconcileVideoUploadOptions } from "@/modules/video-assets/reconciliation/types";

export const parseReconcileVideoUploadArguments = (
  argv: string[],
): ReconcileVideoUploadOptions | null => {
  const flags = new Map<string, string | true>();
  for (const arg of argv) {
    if (arg === "--" && flags.size === 0) continue;
    const match = /^--([a-z][a-z0-9-]*)(?:=(.*))?$/.exec(arg);
    if (!match || flags.has(match[1])) throw new Error("invalid_arguments");
    flags.set(match[1], match[2] ?? true);
  }
  const allowed = new Set([
    "help",
    "asset-id",
    "owner-id",
    "limit",
    "offset",
    "apply",
    "dry-run",
    "confirm",
  ]);
  if ([...flags.keys()].some((flag) => !allowed.has(flag))) throw new Error("invalid_arguments");
  for (const flag of ["help", "apply", "dry-run"]) {
    if (flags.has(flag) && flags.get(flag) !== true) throw new Error("invalid_arguments");
  }
  if (!flags.size || (flags.has("help") && flags.size === 1)) return null;
  if (flags.has("help") || (flags.has("apply") && flags.has("dry-run")))
    throw new Error("invalid_arguments");
  const assetId = flags.get("asset-id");
  const ownerId = flags.get("owner-id");
  if ((assetId === undefined) === (ownerId === undefined)) throw new Error("scope_required");
  for (const value of [assetId, ownerId]) {
    if (value !== undefined && (typeof value !== "string" || !/^[a-z0-9_-]{8,64}$/i.test(value)))
      throw new Error("invalid_scope");
  }
  const apply = flags.has("apply");
  const confirmation = flags.get("confirm") ?? null;
  if (
    (apply && !assetId) ||
    (apply ? !["homolog", "production"].includes(String(confirmation)) : confirmation !== null)
  )
    throw new Error("invalid_confirmation");
  const limitRaw = flags.get("limit") ?? "20";
  if (typeof limitRaw !== "string" || !/^\d+$/.test(limitRaw)) throw new Error("invalid_limit");
  const limit = Number(limitRaw);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 20 || (assetId && flags.has("limit")))
    throw new Error("invalid_limit");
  const offsetRaw = flags.get("offset") ?? "0";
  if (typeof offsetRaw !== "string" || !/^\d+$/.test(offsetRaw)) throw new Error("invalid_offset");
  const offset = Number(offsetRaw);
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > 10_000 ||
    (assetId && flags.has("offset"))
  )
    throw new Error("invalid_offset");
  return {
    assetId: assetId as string | undefined,
    ownerId: ownerId as string | undefined,
    apply,
    confirmation: confirmation as ReconcileVideoUploadOptions["confirmation"],
    limit: assetId ? 1 : limit,
    offset,
  };
};
