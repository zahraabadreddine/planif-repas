-- CreateEnum
CREATE TYPE "HouseholdAccess" AS ENUM ('edit', 'view');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "householdAccess" "HouseholdAccess";

-- CreateTable
CREATE TABLE "HouseholdInvitation" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "access" "HouseholdAccess" NOT NULL,
    "createdById" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedById" UUID,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdInvitation_codeHash_key" ON "HouseholdInvitation"("codeHash");

-- CreateIndex
CREATE INDEX "HouseholdInvitation_householdId_idx" ON "HouseholdInvitation"("householdId");

-- CreateIndex
CREATE INDEX "HouseholdInvitation_expiresAt_idx" ON "HouseholdInvitation"("expiresAt");

-- AddForeignKey
ALTER TABLE "HouseholdInvitation" ADD CONSTRAINT "HouseholdInvitation_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdInvitation" ADD CONSTRAINT "HouseholdInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdInvitation" ADD CONSTRAINT "HouseholdInvitation_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
