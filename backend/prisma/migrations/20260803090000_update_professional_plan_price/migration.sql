UPDATE "subscription_plans"
SET
  "gateway_plan_id" = CASE
    WHEN "price_cents" IS DISTINCT FROM 2990 THEN NULL
    ELSE "gateway_plan_id"
  END,
  "price_cents" = 2990,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" = 'profissional'
  AND "deleted" = false;
