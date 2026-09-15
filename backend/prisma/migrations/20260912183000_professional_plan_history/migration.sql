BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Block writes only while installing an atomic observed baseline and its triggers.
LOCK TABLE "subscription_plans", "professional_subscriptions" IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE "professional_plan_history_coverage" (
  "id" INTEGER NOT NULL PRIMARY KEY CHECK ("id" = 1),
  "started_at" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "subscription_plan_history" (
  "id" BIGSERIAL PRIMARY KEY,
  "plan_id" TEXT NOT NULL,
  "observed_at" TIMESTAMP(3) NOT NULL,
  "observation" TEXT NOT NULL,
  "deleted" BOOLEAN NOT NULL,
  "active" BOOLEAN NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price_cents" INTEGER NOT NULL
);
CREATE TABLE "professional_subscription_history" (
  "id" BIGSERIAL PRIMARY KEY,
  "subscription_id" TEXT NOT NULL,
  "psychologist_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "observed_at" TIMESTAMP(3) NOT NULL,
  "observation" TEXT NOT NULL,
  "deleted" BOOLEAN NOT NULL,
  "source_created_at" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "gateway" TEXT,
  "has_gateway_subscription_id" BOOLEAN NOT NULL,
  "current_period_end" TIMESTAMP(3),
  "grant_started_at" TIMESTAMP(3),
  CONSTRAINT "professional_subscription_history_psychologist_id_fkey"
    FOREIGN KEY ("psychologist_id") REFERENCES "psychologist_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "plan_history_lookup_idx" ON "subscription_plan_history" ("plan_id", "observed_at", "id");
CREATE INDEX "subscription_history_profile_idx" ON "professional_subscription_history" ("psychologist_id", "observed_at", "id");
CREATE INDEX "subscription_history_lookup_idx" ON "professional_subscription_history" ("subscription_id", "observed_at", "id");

INSERT INTO "professional_plan_history_coverage" VALUES (1, clock_timestamp() AT TIME ZONE 'UTC');

-- The baseline records what is observed NOW, not an invented activation date.
INSERT INTO "subscription_plan_history"
  ("plan_id", "observed_at", "observation", "deleted", "active", "slug", "name", "price_cents")
SELECT p.id, c.started_at, 'baseline_observed', p.deleted, p.active, p.slug, p.name, p.price_cents
FROM "subscription_plans" p CROSS JOIN "professional_plan_history_coverage" c;

INSERT INTO "professional_subscription_history"
  ("subscription_id", "psychologist_id", "plan_id", "observed_at", "observation", "deleted",
   "source_created_at", "status", "source", "gateway", "has_gateway_subscription_id", "current_period_end", "grant_started_at")
SELECT s.id, s.psychologist_id, s.plan_id, c.started_at, 'baseline_observed', s.deleted,
  s.created_at, s.status, s.source, s.gateway, COALESCE(s.gateway_subscription_id <> '', false),
  s.current_period_end, s.grant_started_at
FROM "professional_subscriptions" s CROSS JOIN "professional_plan_history_coverage" c;

CREATE FUNCTION capture_subscription_plan_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  observed TIMESTAMP(3) := clock_timestamp() AT TIME ZONE 'UTC';
BEGIN
  IF TG_OP = 'UPDATE' AND
    ROW(OLD.id, OLD.deleted, OLD.active, OLD.slug, OLD.name, OLD.price_cents)
      IS NOT DISTINCT FROM ROW(NEW.id, NEW.deleted, NEW.active, NEW.slug, NEW.name, NEW.price_cents)
  THEN RETURN NEW; END IF;

  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.id <> NEW.id) THEN
    INSERT INTO "subscription_plan_history"
      (plan_id, observed_at, observation, deleted, active, slug, name, price_cents)
    VALUES (OLD.id, observed, 'delete_observed', true, OLD.active, OLD.slug, OLD.name, OLD.price_cents);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    INSERT INTO "subscription_plan_history"
      (plan_id, observed_at, observation, deleted, active, slug, name, price_cents)
    VALUES (NEW.id, observed, lower(TG_OP) || '_observed', NEW.deleted, NEW.active, NEW.slug, NEW.name, NEW.price_cents);
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$;

CREATE FUNCTION capture_professional_subscription_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  observed TIMESTAMP(3) := clock_timestamp() AT TIME ZONE 'UTC';
BEGIN
  IF TG_OP = 'UPDATE' AND
    ROW(OLD.id, OLD.psychologist_id, OLD.plan_id, OLD.deleted, OLD.created_at, OLD.status,
        OLD.source, OLD.gateway, COALESCE(OLD.gateway_subscription_id <> '', false), OLD.current_period_end, OLD.grant_started_at)
      IS NOT DISTINCT FROM
    ROW(NEW.id, NEW.psychologist_id, NEW.plan_id, NEW.deleted, NEW.created_at, NEW.status,
        NEW.source, NEW.gateway, COALESCE(NEW.gateway_subscription_id <> '', false), NEW.current_period_end, NEW.grant_started_at)
  THEN RETURN NEW; END IF;

  IF TG_OP = 'DELETE' OR
    (TG_OP = 'UPDATE' AND (OLD.id <> NEW.id OR OLD.psychologist_id <> NEW.psychologist_id)) THEN
    -- A cascading profile deletion must not recreate its erased history or fail its FK.
    IF EXISTS (SELECT 1 FROM "psychologist_profiles" WHERE id = OLD.psychologist_id) THEN
      INSERT INTO "professional_subscription_history"
        (subscription_id, psychologist_id, plan_id, observed_at, observation, deleted,
         source_created_at, status, source, gateway, has_gateway_subscription_id, current_period_end, grant_started_at)
      VALUES (OLD.id, OLD.psychologist_id, OLD.plan_id, observed, 'delete_observed', true,
        OLD.created_at, OLD.status, OLD.source, OLD.gateway, COALESCE(OLD.gateway_subscription_id <> '', false),
        OLD.current_period_end, OLD.grant_started_at);
    END IF;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    INSERT INTO "professional_subscription_history"
      (subscription_id, psychologist_id, plan_id, observed_at, observation, deleted,
       source_created_at, status, source, gateway, has_gateway_subscription_id, current_period_end, grant_started_at)
    VALUES (NEW.id, NEW.psychologist_id, NEW.plan_id, observed, lower(TG_OP) || '_observed', NEW.deleted,
      NEW.created_at, NEW.status, NEW.source, NEW.gateway, COALESCE(NEW.gateway_subscription_id <> '', false),
      NEW.current_period_end, NEW.grant_started_at);
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER subscription_plan_history_capture
AFTER INSERT OR UPDATE OR DELETE ON "subscription_plans"
FOR EACH ROW EXECUTE FUNCTION capture_subscription_plan_history();
CREATE TRIGGER professional_subscription_history_capture
AFTER INSERT OR UPDATE OR DELETE ON "professional_subscriptions"
FOR EACH ROW EXECUTE FUNCTION capture_professional_subscription_history();

COMMIT;
