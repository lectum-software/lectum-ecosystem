ALTER TABLE "users"
  ADD COLUMN "account_status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "account_status_changed_at" TIMESTAMP(3);

UPDATE "users"
SET
  "account_status" = CASE
    WHEN "deleted" = true THEN 'deleted'
    WHEN "active" = true THEN 'active'
    ELSE 'deactivated'
  END,
  "account_status_changed_at" = CASE
    WHEN "deleted" = true THEN COALESCE("deleted_at", "updated_at", "created_at")
    WHEN "active" = false THEN COALESCE("updated_at", "created_at")
    ELSE NULL
  END;

CREATE INDEX "users_account_status_deleted_idx" ON "users"("account_status", "deleted");
