-- CreateTable
CREATE TABLE "visitor_sessions" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitor_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "device_type" TEXT NOT NULL DEFAULT 'unknown',
    "os" TEXT,
    "browser" TEXT,
    "viewport_width" INTEGER,
    "viewport_height" INTEGER,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitor_sessions_device_type_created_at_idx" ON "visitor_sessions"("device_type", "created_at");

-- CreateIndex
CREATE INDEX "visitor_sessions_user_id_created_at_idx" ON "visitor_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "visitor_sessions_last_seen_at_idx" ON "visitor_sessions"("last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "visitor_sessions_visitor_id_session_id_key" ON "visitor_sessions"("visitor_id", "session_id");

-- AddForeignKey
ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
