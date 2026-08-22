-- AlterTable
ALTER TABLE "User" ADD COLUMN     "building" TEXT,
ADD COLUMN     "floor" TEXT,
ADD COLUMN     "showDetails" BOOLEAN NOT NULL DEFAULT true;

