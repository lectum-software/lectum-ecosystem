ALTER TABLE "professional_whatsapp_weeks"
  DROP CONSTRAINT "professional_whatsapp_weeks_check",
  ADD CONSTRAINT "professional_whatsapp_weeks_acquired_count_check"
    CHECK ("acquired_count" >= 0);
