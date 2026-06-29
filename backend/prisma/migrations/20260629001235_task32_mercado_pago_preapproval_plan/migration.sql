-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "gateway_plan_id" TEXT;

-- CreateIndex
CREATE INDEX "subscription_plans_gateway_plan_id_idx" ON "subscription_plans"("gateway_plan_id");
