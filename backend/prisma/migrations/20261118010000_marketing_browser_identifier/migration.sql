CREATE TABLE "marketing_browser_identifiers" (
  "token_hash" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "consent_revision" INTEGER NOT NULL,
  "fbp" TEXT NOT NULL,
  "captured_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "marketing_browser_identifiers_pkey" PRIMARY KEY ("token_hash"),
  CONSTRAINT "marketing_browser_identifiers_expiry_check" CHECK ("expires_at" > "captured_at"),
  CONSTRAINT "marketing_browser_identifiers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "marketing_consents"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "marketing_browser_identifiers_user_id_idx" ON "marketing_browser_identifiers"("user_id");
CREATE INDEX "marketing_browser_identifiers_expires_at_idx" ON "marketing_browser_identifiers"("expires_at");
