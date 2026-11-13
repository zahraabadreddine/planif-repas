-- CreateEnum
CREATE TYPE "DeliveryPointStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "DeliveryOrderStatus" AS ENUM ('pending', 'confirmed', 'delivering', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "DeliveryOrderType" AS ENUM ('delivery', 'pickup');

-- CreateTable
CREATE TABLE "DeliveryPoint" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "phone" TEXT,
    "status" "DeliveryPointStatus" NOT NULL DEFAULT 'active',
    "openingHours" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryStock" (
    "id" UUID NOT NULL,
    "deliveryPointId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "priceFcfa" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryOrder" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "deliveryPointId" UUID NOT NULL,
    "type" "DeliveryOrderType" NOT NULL,
    "status" "DeliveryOrderStatus" NOT NULL DEFAULT 'pending',
    "deliveryFeeFcfa" INTEGER NOT NULL DEFAULT 0,
    "totalFcfa" INTEGER NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryOrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "priceFcfa" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryPoint_status_idx" ON "DeliveryPoint"("status");

-- CreateIndex
CREATE INDEX "DeliveryPoint_commune_idx" ON "DeliveryPoint"("commune");

-- CreateIndex
CREATE INDEX "DeliveryStock_deliveryPointId_idx" ON "DeliveryStock"("deliveryPointId");

-- CreateIndex
CREATE INDEX "DeliveryStock_ingredientId_idx" ON "DeliveryStock"("ingredientId");

-- CreateIndex
CREATE INDEX "DeliveryOrder_householdId_idx" ON "DeliveryOrder"("householdId");

-- CreateIndex
CREATE INDEX "DeliveryOrder_deliveryPointId_idx" ON "DeliveryOrder"("deliveryPointId");

-- CreateIndex
CREATE INDEX "DeliveryOrder_status_idx" ON "DeliveryOrder"("status");

-- CreateIndex
CREATE INDEX "DeliveryOrderItem_orderId_idx" ON "DeliveryOrderItem"("orderId");

-- AddForeignKey
ALTER TABLE "DeliveryStock" ADD CONSTRAINT "DeliveryStock_deliveryPointId_fkey" FOREIGN KEY ("deliveryPointId") REFERENCES "DeliveryPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryStock" ADD CONSTRAINT "DeliveryStock_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryStock" ADD CONSTRAINT "DeliveryStock_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "MarketUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrder" ADD CONSTRAINT "DeliveryOrder_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrder" ADD CONSTRAINT "DeliveryOrder_deliveryPointId_fkey" FOREIGN KEY ("deliveryPointId") REFERENCES "DeliveryPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrderItem" ADD CONSTRAINT "DeliveryOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "DeliveryOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrderItem" ADD CONSTRAINT "DeliveryOrderItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrderItem" ADD CONSTRAINT "DeliveryOrderItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "MarketUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable (ajout frais de livraison par point)
ALTER TABLE "DeliveryPoint" ADD COLUMN "deliveryFeeFcfa" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex (clé unique composée pour le stock)
CREATE UNIQUE INDEX "DeliveryStock_deliveryPointId_ingredientId_unitId_key" ON "DeliveryStock"("deliveryPointId", "ingredientId", "unitId");
