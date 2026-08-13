-- Turn on the experience tag for active professional entitlements when the stored
-- false value predates the professional/courtesy entitlement. This preserves
-- explicit opt-outs made after the professional entitlement started.
UPDATE "psychologist_profiles" AS profile
SET "show_experience_tag" = TRUE,
    "updated_at" = NOW()
WHERE profile."deleted" = FALSE
  AND profile."show_experience_tag" = FALSE
  AND EXISTS (
    SELECT 1
    FROM "professional_subscriptions" AS subscription
    INNER JOIN "subscription_plans" AS plan
      ON plan."id" = subscription."plan_id"
    WHERE subscription."psychologist_id" = profile."id"
      AND subscription."deleted" = FALSE
      AND subscription."status" = 'ativa'
      AND (subscription."current_period_end" IS NULL OR subscription."current_period_end" > NOW())
      AND plan."deleted" = FALSE
      AND plan."active" = TRUE
      AND plan."slug" <> 'gratuito'
      AND profile."updated_at" <= COALESCE(subscription."grant_started_at", subscription."created_at")
  );
