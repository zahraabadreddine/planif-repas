-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'wave', 'orange_money');

-- AlterTable
ALTER TABLE "DeliveryOrder" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'cash';
