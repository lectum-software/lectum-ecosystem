-- AlterTable
ALTER TABLE "profile_view_events" ADD COLUMN     "search_result_position" INTEGER;

-- CreateIndex
CREATE INDEX "profile_view_events_psychologist_id_source_created_at_idx" ON "profile_view_events"("psychologist_id", "source", "created_at");
