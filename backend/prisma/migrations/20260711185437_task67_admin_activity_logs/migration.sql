-- DropIndex
DROP INDEX "approaches_active_deleted_idx";

-- DropIndex
DROP INDEX "services_active_deleted_idx";

-- CreateTable
CREATE TABLE "admin_activity_logs" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admin_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'admin_panel',
    "area" TEXT,
    "changed_fields" JSONB,
    "safe_before" JSONB,
    "safe_after" JSONB,
    "reason" TEXT,
    "metadata" JSONB,

    CONSTRAINT "admin_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_activity_logs_admin_id_created_at_idx" ON "admin_activity_logs"("admin_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_activity_logs_target_type_target_id_created_at_idx" ON "admin_activity_logs"("target_type", "target_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_activity_logs_domain_action_created_at_idx" ON "admin_activity_logs"("domain", "action", "created_at");

-- CreateIndex
CREATE INDEX "admin_activity_logs_source_created_at_idx" ON "admin_activity_logs"("source", "created_at");

-- AddForeignKey
ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
