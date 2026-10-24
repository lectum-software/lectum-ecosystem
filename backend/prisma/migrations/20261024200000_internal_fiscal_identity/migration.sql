CREATE TABLE "fiscal_identity_event" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "psychologist_id" TEXT NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "source" TEXT NOT NULL,
    "actor_id" TEXT,
    "registry_check_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fiscal_identity_event_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fiscal_identity_event_source_check" CHECK (
      ("source" = 'manual_admin' AND "actor_id" IS NOT NULL) OR
      ("source" = 'infosimples' AND "registry_check_id" IS NOT NULL)
    )
);
CREATE UNIQUE INDEX "fiscal_identity_event_sequence_key" ON "fiscal_identity_event"("sequence");
CREATE INDEX "fiscal_identity_event_psychologist_id_sequence_idx" ON "fiscal_identity_event"("psychologist_id", "sequence");
ALTER TABLE "fiscal_identity_event" ADD CONSTRAINT "fiscal_identity_event_psychologist_id_fkey"
FOREIGN KEY ("psychologist_id") REFERENCES "psychologist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
