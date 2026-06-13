-- Liberar video de apresentacao para todos os psicologos, inclusive plano gratuito.
UPDATE "subscription_plans"
SET "features" = jsonb_set(COALESCE("features"::jsonb, '{}'::jsonb), '{profile_video}', 'true'::jsonb, true),
    "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" = 'gratuito';