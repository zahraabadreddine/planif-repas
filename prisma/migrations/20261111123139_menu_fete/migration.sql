-- AlterTable
ALTER TABLE "PlannedMeal" ADD COLUMN     "course" TEXT;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "householdId" UUID;

-- CreateIndex
CREATE INDEX "Recipe_householdId_idx" ON "Recipe"("householdId");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
