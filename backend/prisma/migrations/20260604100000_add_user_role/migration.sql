ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'paciente';

CREATE INDEX IF NOT EXISTS "users_role_deleted_idx" ON "users"("role", "deleted");
