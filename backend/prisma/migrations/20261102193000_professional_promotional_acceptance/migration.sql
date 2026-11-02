-- Expand accepted actions; existing evidence remains immutable and unchanged.
BEGIN;
ALTER TABLE "legal_acceptances" DROP CONSTRAINT "legal_acceptance_action";
ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptance_action"
 CHECK ("action" IN ('terms_accept', 'privacy_acknowledge', 'privacy_acknowledge_and_promotional_authorize'));

CREATE OR REPLACE FUNCTION lectum_guard_legal_acceptance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE doc "legal_document_versions"%ROWTYPE;
BEGIN
 IF TG_OP = 'UPDATE' THEN RAISE EXCEPTION 'legal_acceptance_immutable'; END IF;
 SELECT * INTO doc FROM "legal_document_versions" WHERE id = NEW.document_id;
 IF NOT FOUND OR doc.status <> 'published' OR doc.content_hash <> NEW.document_hash OR
    (doc.kind = 'terms' AND NEW.action <> 'terms_accept') OR
    (doc.kind = 'privacy' AND NEW.action NOT IN ('privacy_acknowledge', 'privacy_acknowledge_and_promotional_authorize')) THEN
  RAISE EXCEPTION 'legal_acceptance_invalid';
 END IF;
 IF NEW.action = 'privacy_acknowledge_and_promotional_authorize' AND NOT EXISTS (
  SELECT 1 FROM "users" WHERE id = NEW.user_id AND role = 'psicologo'
 ) THEN
  RAISE EXCEPTION 'legal_acceptance_invalid';
 END IF;
 RETURN NEW;
END; $$;
COMMIT;
