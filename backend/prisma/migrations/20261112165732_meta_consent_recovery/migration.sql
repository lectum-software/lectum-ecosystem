-- CreateTable
CREATE TABLE "marketing_consents" (
    "user_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "document_version" TEXT,
    "granted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_consents_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "marketing_consent_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "document_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_consent_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_attributions" (
    "user_id" TEXT NOT NULL,
    "consent_revision" INTEGER NOT NULL,
    "campaigns" JSONB NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_attributions_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "marketing_subscribe_jobs" (
    "id" TEXT NOT NULL,
    "source_event_id" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_token" TEXT,
    "lease_until" TIMESTAMP(3),
    "last_error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_subscribe_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketing_consent_events_user_id_revision_key" ON "marketing_consent_events"("user_id", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_subscribe_jobs_source_event_id_key" ON "marketing_subscribe_jobs"("source_event_id");

-- CreateIndex
CREATE INDEX "marketing_subscribe_jobs_state_next_attempt_at_lease_until_idx" ON "marketing_subscribe_jobs"("state", "next_attempt_at", "lease_until");

-- AddForeignKey
ALTER TABLE "marketing_consents" ADD CONSTRAINT "marketing_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_consent_events" ADD CONSTRAINT "marketing_consent_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "marketing_consents"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_attributions" ADD CONSTRAINT "marketing_attributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "marketing_consents"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_subscribe_jobs" ADD CONSTRAINT "marketing_subscribe_jobs_source_event_id_fkey" FOREIGN KEY ("source_event_id") REFERENCES "billing_gateway_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
