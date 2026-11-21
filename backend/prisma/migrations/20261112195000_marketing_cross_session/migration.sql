ALTER TABLE "marketing_attributions"
ADD COLUMN "last_campaigns" JSONB,
ADD COLUMN "last_captured_at" TIMESTAMP(3),
ADD COLUMN "expires_at" TIMESTAMP(3),
ADD COLUMN "source_consent_at" TIMESTAMP(3),
ADD COLUMN "source_token_hash" TEXT;

CREATE UNIQUE INDEX "marketing_attributions_source_token_hash_key" ON "marketing_attributions"("source_token_hash");

CREATE TABLE "marketing_guest_attributions" (
  "token_hash" TEXT NOT NULL,
  "document_version" TEXT NOT NULL,
  "first_campaigns" JSONB NOT NULL,
  "last_campaigns" JSONB NOT NULL,
  "granted_at" TIMESTAMP(3) NOT NULL,
  "first_at" TIMESTAMP(3) NOT NULL,
  "last_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "claimed" BOOLEAN NOT NULL DEFAULT false,
  "revoked" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "marketing_guest_attributions_pkey" PRIMARY KEY ("token_hash")
);
CREATE INDEX "marketing_guest_attributions_expires_at_idx" ON "marketing_guest_attributions"("expires_at");
