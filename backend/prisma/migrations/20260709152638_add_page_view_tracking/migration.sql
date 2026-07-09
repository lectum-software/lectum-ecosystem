-- CreateTable
CREATE TABLE "page_view_events" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitor_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "path" TEXT NOT NULL,
    "normalized_path" TEXT NOT NULL,
    "title" TEXT,
    "referrer_host" TEXT,
    "traffic_source" TEXT NOT NULL DEFAULT 'direct',
    "traffic_medium" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "page_kind" TEXT NOT NULL DEFAULT 'other',
    "target_type" TEXT,
    "target_id" TEXT,
    "display_mode" TEXT NOT NULL DEFAULT 'unknown',
    "is_entry" BOOLEAN NOT NULL DEFAULT false,
    "entry_path" TEXT,
    "duration_seconds" INTEGER,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_view_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "important_action_events" (
    "id" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitor_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action_type" TEXT NOT NULL,
    "path" TEXT,
    "page_kind" TEXT NOT NULL DEFAULT 'other',
    "target_type" TEXT,
    "target_id" TEXT,
    "display_mode" TEXT NOT NULL DEFAULT 'unknown',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "important_action_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_view_events_occurred_at_idx" ON "page_view_events"("occurred_at");

-- CreateIndex
CREATE INDEX "page_view_events_session_id_occurred_at_idx" ON "page_view_events"("session_id", "occurred_at");

-- CreateIndex
CREATE INDEX "page_view_events_visitor_id_occurred_at_idx" ON "page_view_events"("visitor_id", "occurred_at");

-- CreateIndex
CREATE INDEX "page_view_events_user_id_occurred_at_idx" ON "page_view_events"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "page_view_events_traffic_source_occurred_at_idx" ON "page_view_events"("traffic_source", "occurred_at");

-- CreateIndex
CREATE INDEX "page_view_events_page_kind_occurred_at_idx" ON "page_view_events"("page_kind", "occurred_at");

-- CreateIndex
CREATE INDEX "page_view_events_target_type_target_id_occurred_at_idx" ON "page_view_events"("target_type", "target_id", "occurred_at");

-- CreateIndex
CREATE INDEX "page_view_events_session_id_is_entry_idx" ON "page_view_events"("session_id", "is_entry");

-- CreateIndex
CREATE INDEX "page_view_events_entry_path_occurred_at_idx" ON "page_view_events"("entry_path", "occurred_at");

-- CreateIndex
CREATE INDEX "important_action_events_occurred_at_idx" ON "important_action_events"("occurred_at");

-- CreateIndex
CREATE INDEX "important_action_events_session_id_occurred_at_idx" ON "important_action_events"("session_id", "occurred_at");

-- CreateIndex
CREATE INDEX "important_action_events_visitor_id_occurred_at_idx" ON "important_action_events"("visitor_id", "occurred_at");

-- CreateIndex
CREATE INDEX "important_action_events_user_id_occurred_at_idx" ON "important_action_events"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "important_action_events_action_type_occurred_at_idx" ON "important_action_events"("action_type", "occurred_at");

-- CreateIndex
CREATE INDEX "important_action_events_page_kind_occurred_at_idx" ON "important_action_events"("page_kind", "occurred_at");

-- CreateIndex
CREATE INDEX "important_action_events_target_type_target_id_occurred_at_idx" ON "important_action_events"("target_type", "target_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "page_view_events" ADD CONSTRAINT "page_view_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "important_action_events" ADD CONSTRAINT "important_action_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
