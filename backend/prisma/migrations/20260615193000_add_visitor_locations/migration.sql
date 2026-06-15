-- CreateTable
CREATE TABLE "visitor_locations" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitor_id" TEXT NOT NULL,
    "session_id" TEXT,
    "user_id" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ip',
    "confidence" DOUBLE PRECISION,
    "provider" TEXT,

    CONSTRAINT "visitor_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitor_locations_visitor_id_created_at_idx" ON "visitor_locations"("visitor_id", "created_at");

-- CreateIndex
CREATE INDEX "visitor_locations_user_id_created_at_idx" ON "visitor_locations"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "visitor_locations_city_state_country_idx" ON "visitor_locations"("city", "state", "country");

-- AddForeignKey
ALTER TABLE "visitor_locations" ADD CONSTRAINT "visitor_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
