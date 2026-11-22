-- CreateTable
CREATE TABLE "marketing_checkout_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "consent_revision" INTEGER NOT NULL,
    "account_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "document_version" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "client_user_agent" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_checkout_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_checkout_entries_user_id_consent_revision_created_idx" ON "marketing_checkout_entries"("user_id", "consent_revision", "created_at");

-- CreateIndex
CREATE INDEX "marketing_checkout_entries_expires_at_idx" ON "marketing_checkout_entries"("expires_at");

-- AddForeignKey
ALTER TABLE "marketing_checkout_entries" ADD CONSTRAINT "marketing_checkout_entries_token_hash_fkey" FOREIGN KEY ("token_hash") REFERENCES "marketing_browser_identifiers"("token_hash") ON DELETE CASCADE ON UPDATE CASCADE;
