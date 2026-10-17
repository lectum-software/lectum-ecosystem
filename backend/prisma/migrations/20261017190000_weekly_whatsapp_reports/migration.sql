ALTER TABLE "contact_requests" ADD COLUMN "visitor_key" TEXT;

CREATE TABLE "professional_whatsapp_weeks" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "psychologist_id" TEXT NOT NULL,
  "week_start" TIMESTAMP(3) NOT NULL,
  "week_end" TIMESTAMP(3) NOT NULL,
  "available_at" TIMESTAMP(3) NOT NULL,
  "people_count" INTEGER NOT NULL CHECK ("people_count" > 0),
  "acquired_count" INTEGER CHECK ("acquired_count" >= 0 AND "acquired_count" <= "people_count"),
  "answered_at" TIMESTAMP(3),
  "auto_opened_at" TIMESTAMP(3),
  "push_claimed_at" TIMESTAMP(3),
  "push_status" TEXT NOT NULL DEFAULT 'pending',
  "notification_id" TEXT NOT NULL REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "professional_whatsapp_weeks_notification_id_key" ON "professional_whatsapp_weeks"("notification_id");
CREATE UNIQUE INDEX "professional_whatsapp_weeks_psychologist_id_week_start_key" ON "professional_whatsapp_weeks"("psychologist_id", "week_start");
CREATE INDEX "professional_whatsapp_weeks_psychologist_id_week_end_idx" ON "professional_whatsapp_weeks"("psychologist_id", "week_end");
CREATE INDEX "professional_whatsapp_weeks_push_status_available_at_idx" ON "professional_whatsapp_weeks"("push_status", "available_at");
