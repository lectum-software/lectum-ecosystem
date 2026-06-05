CREATE TABLE "subscription_plans" (
  "id" TEXT NOT NULL,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price_cents" INTEGER NOT NULL DEFAULT 0,
  "interval" TEXT NOT NULL DEFAULT 'month',
  "features" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "professional_subscriptions" (
  "id" TEXT NOT NULL,
  "deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "psychologist_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'inativa',
  "gateway" TEXT,
  "gateway_subscription_id" TEXT,
  "current_period_end" TIMESTAMP(3),

  CONSTRAINT "professional_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_plans_slug_key" ON "subscription_plans"("slug");
CREATE INDEX "subscription_plans_active_deleted_idx" ON "subscription_plans"("active", "deleted");
CREATE INDEX "professional_subscriptions_psychologist_id_status_idx" ON "professional_subscriptions"("psychologist_id", "status");
CREATE INDEX "professional_subscriptions_plan_id_idx" ON "professional_subscriptions"("plan_id");

ALTER TABLE "professional_subscriptions"
  ADD CONSTRAINT "professional_subscriptions_psychologist_id_fkey"
  FOREIGN KEY ("psychologist_id") REFERENCES "psychologist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "professional_subscriptions"
  ADD CONSTRAINT "professional_subscriptions_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "subscription_plans" ("id", "slug", "name", "price_cents", "interval", "features", "active", "created_at", "updated_at") VALUES
  (
    'subscription_plan_gratuito',
    'gratuito',
    'Plano Gratuito',
    0,
    'month',
    '{"specialties_limit":3,"services_limit":1,"whatsapp_conversion":true,"verified_badge":false,"search_priority":false,"professional_community":false,"profile_video":false,"analytics":false,"patient_testimonials":false,"priority_support":false}'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'subscription_plan_profissional',
    'profissional',
    'Plano Profissional',
    990,
    'month',
    '{"specialties_limit":10,"services_limit":"all","whatsapp_conversion":true,"verified_badge":true,"search_priority":true,"professional_community":true,"profile_video":true,"analytics":true,"patient_testimonials":true,"priority_support":true}'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
