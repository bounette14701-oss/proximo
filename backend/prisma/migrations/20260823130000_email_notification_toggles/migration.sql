-- Mails automatiques à la résidence : interrupteurs admin (défaut activés)
ALTER TABLE "EmailSettings"
  ADD COLUMN "incidentNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "listingNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
