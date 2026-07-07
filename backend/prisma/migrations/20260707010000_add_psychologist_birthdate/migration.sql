-- Add optional birthdate storage for the private psychologist profile edit flow.
-- The API/form require this value on update, while existing profiles remain nullable until edited.

ALTER TABLE "psychologist_profiles"
ADD COLUMN "birthdate" TIMESTAMP(3);
