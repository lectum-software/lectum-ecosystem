/*
  Warnings:

  - You are about to drop the `user_two_auths` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "user_two_auths" DROP CONSTRAINT "user_two_auths_user_id_fkey";

-- DropTable
DROP TABLE "user_two_auths";
