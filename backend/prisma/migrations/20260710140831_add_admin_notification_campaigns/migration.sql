-- CreateTable
CREATE TABLE "admin_notification_campaigns" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "redirect" TEXT,
    "audience" TEXT NOT NULL,
    "channels" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "created_by_admin_id" TEXT NOT NULL,

    CONSTRAINT "admin_notification_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaign_id" TEXT,
    "notification_id" TEXT,
    "user_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "trigger_key" TEXT,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "metadata" JSONB,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_notification_campaigns_status_scheduled_at_idx" ON "admin_notification_campaigns"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "admin_notification_campaigns_created_by_admin_id_created_at_idx" ON "admin_notification_campaigns"("created_by_admin_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_notification_campaigns_audience_deleted_idx" ON "admin_notification_campaigns"("audience", "deleted");

-- CreateIndex
CREATE INDEX "notification_deliveries_campaign_id_channel_status_idx" ON "notification_deliveries"("campaign_id", "channel", "status");

-- CreateIndex
CREATE INDEX "notification_deliveries_notification_id_idx" ON "notification_deliveries"("notification_id");

-- CreateIndex
CREATE INDEX "notification_deliveries_user_id_created_at_idx" ON "notification_deliveries"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notification_deliveries_source_trigger_key_created_at_idx" ON "notification_deliveries"("source", "trigger_key", "created_at");

-- CreateIndex
CREATE INDEX "notification_deliveries_channel_status_created_at_idx" ON "notification_deliveries"("channel", "status", "created_at");

-- AddForeignKey
ALTER TABLE "admin_notification_campaigns" ADD CONSTRAINT "admin_notification_campaigns_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "admin_notification_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
