-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "gateway_token" TEXT NOT NULL,
    "brand" TEXT,
    "last4" TEXT,
    "exp_month" INTEGER,
    "exp_year" INTEGER,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_methods_user_id_idx" ON "payment_methods"("user_id");

-- CreateIndex
CREATE INDEX "payment_methods_user_id_gateway_idx" ON "payment_methods"("user_id", "gateway");

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
