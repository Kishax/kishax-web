/*
  Warnings:

  - You are about to drop the column `otp` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `otp_expires` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "otp",
DROP COLUMN "otp_expires";
