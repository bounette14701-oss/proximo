-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "stripeSessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Lead_stripeSessionId_key" ON "Lead"("stripeSessionId");

-- CreateTable
CREATE TABLE "Provision" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "domain" TEXT,
    "adminEmail" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Provision_leadId_key" ON "Provision"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Provision_slug_key" ON "Provision"("slug");

-- CreateIndex
CREATE INDEX "Provision_status_idx" ON "Provision"("status");

-- AddForeignKey
ALTER TABLE "Provision" ADD CONSTRAINT "Provision_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
