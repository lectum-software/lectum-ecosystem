CREATE TABLE "testimonial_invitation_batches" (
  "id" TEXT PRIMARY KEY,
  "patient_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "window_start" TIMESTAMP(3) NOT NULL,
  "window_end" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "push_status" TEXT NOT NULL DEFAULT 'pending',
  "push_claimed_at" TIMESTAMP(3),
  "notification_id" TEXT,
  CONSTRAINT "testimonial_window_positive" CHECK ("window_end" > "window_start")
);
CREATE INDEX "testimonial_invitation_batches_status_window_end_idx" ON "testimonial_invitation_batches"("status", "window_end");
CREATE INDEX "testimonial_invitation_batches_patient_id_window_end_idx" ON "testimonial_invitation_batches"("patient_id", "window_end");
CREATE INDEX "testimonial_invitation_batches_push_status_idx" ON "testimonial_invitation_batches"("push_status");
CREATE TABLE "testimonial_invitation_members" (
  "id" TEXT PRIMARY KEY,
  "batch_id" TEXT NOT NULL REFERENCES "testimonial_invitation_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "patient_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "psychologist_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "reply_id" TEXT NOT NULL,
  "included" BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX "testimonial_invitation_members_patient_id_psychologist_id_key" ON "testimonial_invitation_members"("patient_id", "psychologist_id");
CREATE INDEX "testimonial_invitation_members_batch_id_idx" ON "testimonial_invitation_members"("batch_id");
