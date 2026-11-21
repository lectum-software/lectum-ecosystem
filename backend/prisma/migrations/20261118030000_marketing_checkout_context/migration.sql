CREATE TABLE "marketing_checkout_contexts" (
    "operation_id" TEXT NOT NULL PRIMARY KEY,
    "token_hash" TEXT NOT NULL,
    "document_version" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "client_user_agent" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marketing_checkout_contexts_expiry_check" CHECK ("expires_at" > "captured_at"),
    CONSTRAINT "marketing_checkout_contexts_token_hash_fkey" FOREIGN KEY ("token_hash") REFERENCES "marketing_browser_identifiers"("token_hash") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "marketing_checkout_contexts_token_hash_idx" ON "marketing_checkout_contexts"("token_hash");
CREATE INDEX "marketing_checkout_contexts_expires_at_idx" ON "marketing_checkout_contexts"("expires_at");
