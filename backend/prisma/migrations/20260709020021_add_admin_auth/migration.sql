-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "password_confirm" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_date" TIMESTAMP(3),
    "confirm_code" TEXT,
    "confirm_date" TIMESTAMP(3),
    "recovery_code" TEXT,
    "recovery_date" TIMESTAMP(3),
    "need_reset" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_tokens" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admin_id" TEXT NOT NULL,
    "token" TEXT,
    "device_id" TEXT,

    CONSTRAINT "admin_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "admins_email_deleted_idx" ON "admins"("email", "deleted");

-- CreateIndex
CREATE INDEX "admins_active_deleted_idx" ON "admins"("active", "deleted");

-- CreateIndex
CREATE INDEX "admin_tokens_admin_id_device_id_idx" ON "admin_tokens"("admin_id", "device_id");

-- CreateIndex
CREATE INDEX "admin_tokens_token_idx" ON "admin_tokens"("token");

-- CreateIndex
CREATE INDEX "admin_tokens_admin_id_token_device_id_idx" ON "admin_tokens"("admin_id", "token", "device_id");

-- AddForeignKey
ALTER TABLE "admin_tokens" ADD CONSTRAINT "admin_tokens_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
