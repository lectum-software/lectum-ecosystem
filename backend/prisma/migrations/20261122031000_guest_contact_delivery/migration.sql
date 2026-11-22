ALTER TABLE "marketing_delivery_jobs" ADD COLUMN "guest_token_hash" TEXT;
CREATE INDEX "marketing_delivery_jobs_guest_token_hash_idx" ON "marketing_delivery_jobs"("guest_token_hash");
ALTER TABLE "marketing_delivery_jobs" ADD CONSTRAINT "marketing_delivery_jobs_guest_token_hash_fkey" FOREIGN KEY ("guest_token_hash") REFERENCES "marketing_guest_attributions"("token_hash") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_delivery_jobs" ADD CONSTRAINT "marketing_delivery_guest_scope" CHECK ("guest_token_hash" IS NULL OR ("user_id" IS NULL AND "consent_revision" IS NULL AND "conversion" = 'patient_contact'));
