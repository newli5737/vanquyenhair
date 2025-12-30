-- CreateEnum
CREATE TYPE "ClassEnrollmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "class_enrollment_requests" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "trainingClassId" TEXT NOT NULL,
    "status" "ClassEnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,

    CONSTRAINT "class_enrollment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "class_enrollment_requests_studentId_trainingClassId_key" ON "class_enrollment_requests"("studentId", "trainingClassId");

-- AddForeignKey
ALTER TABLE "class_enrollment_requests" ADD CONSTRAINT "class_enrollment_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollment_requests" ADD CONSTRAINT "class_enrollment_requests_trainingClassId_fkey" FOREIGN KEY ("trainingClassId") REFERENCES "training_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollment_requests" ADD CONSTRAINT "class_enrollment_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
