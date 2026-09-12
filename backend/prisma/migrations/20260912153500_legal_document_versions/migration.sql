-- Additive: no existing row or historical acceptance is modified.
CREATE TABLE "legal_document_versions" (
 "id" TEXT NOT NULL, "kind" TEXT NOT NULL, "version" INTEGER NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'draft', "revision" INTEGER NOT NULL DEFAULT 1,
 "title" TEXT NOT NULL, "body" TEXT NOT NULL, "change_summary" TEXT NOT NULL,
 "content_hash" TEXT NOT NULL, "created_by_admin_id" TEXT NOT NULL,
 "updated_by_admin_id" TEXT NOT NULL, "published_by_admin_id" TEXT,
 "published_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "legal_document_versions_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "legal_document_kind" CHECK ("kind" IN ('terms','privacy')),
 CONSTRAINT "legal_document_state" CHECK ("status" IN ('draft','published')),
 CONSTRAINT "legal_document_numbers" CHECK ("version" > 0 AND "revision" > 0),
 CONSTRAINT "legal_document_publication" CHECK (("status" = 'draft' AND "published_at" IS NULL AND "published_by_admin_id" IS NULL) OR ("status" = 'published' AND "published_at" IS NOT NULL AND "published_by_admin_id" IS NOT NULL))
);
CREATE UNIQUE INDEX "legal_document_versions_kind_version_key" ON "legal_document_versions"("kind","version");
CREATE INDEX "legal_document_versions_kind_status_published_at_idx" ON "legal_document_versions"("kind","status","published_at");
CREATE TABLE "legal_acceptances" (
 "id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "document_id" TEXT NOT NULL,
 "document_hash" TEXT NOT NULL, "action" TEXT NOT NULL, "adult_confirmed" BOOLEAN NOT NULL,
 "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "legal_acceptance_adult" CHECK ("adult_confirmed" = true),
 CONSTRAINT "legal_acceptance_action" CHECK ("action" IN ('terms_accept','privacy_acknowledge')),
 CONSTRAINT "legal_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "legal_acceptances_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "legal_acceptances_user_id_document_id_key" ON "legal_acceptances"("user_id","document_id");
CREATE INDEX "legal_acceptances_document_id_accepted_at_idx" ON "legal_acceptances"("document_id","accepted_at");
CREATE FUNCTION lectum_guard_published_legal_document() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status = 'published' THEN RAISE EXCEPTION 'legal_document_immutable'; END IF;
 IF TG_OP = 'UPDATE' AND (NEW.kind <> OLD.kind OR NEW.version <> OLD.version OR NEW.id <> OLD.id) THEN
  RAISE EXCEPTION 'legal_document_identity_immutable';
 END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER legal_document_immutable BEFORE UPDATE OR DELETE ON "legal_document_versions"
 FOR EACH ROW EXECUTE FUNCTION lectum_guard_published_legal_document();
CREATE FUNCTION lectum_guard_legal_acceptance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE doc "legal_document_versions"%ROWTYPE;
BEGIN
 IF TG_OP = 'UPDATE' THEN RAISE EXCEPTION 'legal_acceptance_immutable'; END IF;
 SELECT * INTO doc FROM "legal_document_versions" WHERE id = NEW.document_id;
 IF NOT FOUND OR doc.status <> 'published' OR doc.content_hash <> NEW.document_hash OR
    NEW.action <> (CASE WHEN doc.kind = 'terms' THEN 'terms_accept' ELSE 'privacy_acknowledge' END) THEN
  RAISE EXCEPTION 'legal_acceptance_invalid';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER legal_acceptance_immutable BEFORE INSERT OR UPDATE ON "legal_acceptances"
 FOR EACH ROW EXECUTE FUNCTION lectum_guard_legal_acceptance();
