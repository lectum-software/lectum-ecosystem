ALTER TABLE "marketing_guest_attributions"
  ADD COLUMN "browser_fbp" TEXT,
  ADD COLUMN "browser_captured_at" TIMESTAMP(3);

ALTER TABLE "marketing_guest_attributions" ADD CONSTRAINT "guest_browser_evidence_pair"
  CHECK (("browser_fbp" IS NULL) = ("browser_captured_at" IS NULL));
