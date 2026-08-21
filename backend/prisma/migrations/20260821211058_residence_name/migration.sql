-- AlterTable
ALTER TABLE "SyndicSettings" ADD COLUMN     "residenceName" TEXT,
ALTER COLUMN "agencyName" DROP DEFAULT,
ALTER COLUMN "email" DROP DEFAULT;

