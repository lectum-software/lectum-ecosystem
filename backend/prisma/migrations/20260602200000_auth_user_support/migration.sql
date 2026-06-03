ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "avatar" TEXT,
  ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS "password" TEXT,
  ADD COLUMN IF NOT EXISTS "password_confirm" TEXT,
  ADD COLUMN IF NOT EXISTS "need_reset" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "confirmed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "confirmed_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "recovery_code" TEXT,
  ADD COLUMN IF NOT EXISTS "recovery_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "confirm_code" TEXT,
  ADD COLUMN IF NOT EXISTS "confirm_date" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "user_tokens" (
  "id" TEXT NOT NULL,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id" TEXT NOT NULL,
  "token" TEXT,
  "device_id" TEXT,
  CONSTRAINT "user_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "user_backgrounds" (
  "id" TEXT NOT NULL,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "data" JSONB,
  "device_id" TEXT,
  CONSTRAINT "user_backgrounds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_backgrounds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "user_two_auths" (
  "id" TEXT NOT NULL,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "user_two_auths_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_two_auths_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "notification_subscriptions" (
  "id" TEXT NOT NULL,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "device_id" TEXT,
  "user_id" TEXT NOT NULL,
  "subscription" JSONB,
  CONSTRAINT "notification_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "log__users" (
  "id" TEXT NOT NULL,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ref_id" TEXT,
  "action" TEXT NOT NULL,
  "old" TEXT,
  "new" TEXT,
  CONSTRAINT "log__users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "log__users_ref_id_fkey" FOREIGN KEY ("ref_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_tokens_user_id_device_id_idx" ON "user_tokens"("user_id", "device_id");
CREATE INDEX IF NOT EXISTS "user_tokens_token_idx" ON "user_tokens"("token");
CREATE INDEX IF NOT EXISTS "user_backgrounds_user_id_type_idx" ON "user_backgrounds"("user_id", "type");
CREATE INDEX IF NOT EXISTS "user_two_auths_user_id_deleted_idx" ON "user_two_auths"("user_id", "deleted");
CREATE INDEX IF NOT EXISTS "notification_subscriptions_user_id_device_id_idx" ON "notification_subscriptions"("user_id", "device_id");
CREATE INDEX IF NOT EXISTS "log__users_ref_id_idx" ON "log__users"("ref_id");
