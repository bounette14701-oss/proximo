-- CreateTable
CREATE TABLE "EmailSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "mode" TEXT NOT NULL DEFAULT 'brevo',
    "fromName" TEXT NOT NULL DEFAULT 'Proximo',
    "fromEmail" TEXT NOT NULL DEFAULT 'no-reply@proximo.local',
    "brevoApiKey" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER DEFAULT 587,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);
