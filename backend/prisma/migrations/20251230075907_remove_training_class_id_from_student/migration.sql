/*
  Warnings:

  - You are about to drop the column `trainingClassId` on the `student_profiles` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "student_profiles" DROP CONSTRAINT "student_profiles_trainingClassId_fkey";

-- AlterTable
ALTER TABLE "student_profiles" DROP COLUMN "trainingClassId";
