ALTER TABLE "users"
  ADD COLUMN "account_status_expires_at" TIMESTAMP(3);

CREATE INDEX "users_account_status_account_status_expires_at_deleted_idx"
  ON "users"("account_status", "account_status_expires_at", "deleted");
