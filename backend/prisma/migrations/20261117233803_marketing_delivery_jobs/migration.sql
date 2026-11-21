-- CreateTable
CREATE TABLE "marketing_delivery_jobs" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "conversion" TEXT NOT NULL,
    "source_ref" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_token" TEXT,
    "lease_until" TIMESTAMP(3),
    "last_error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_delivery_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketing_delivery_jobs_event_id_key" ON "marketing_delivery_jobs"("event_id");

-- CreateIndex
CREATE INDEX "marketing_delivery_jobs_state_next_attempt_at_lease_until_idx" ON "marketing_delivery_jobs"("state", "next_attempt_at", "lease_until");

-- CreateIndex
CREATE INDEX "marketing_delivery_jobs_expires_at_idx" ON "marketing_delivery_jobs"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_delivery_jobs_conversion_source_ref_key" ON "marketing_delivery_jobs"("conversion", "source_ref");
