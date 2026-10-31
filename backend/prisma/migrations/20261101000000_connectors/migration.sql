-- AlterTable
ALTER TABLE "ConnectedIntegration"
  ADD COLUMN "config" JSONB,
  ADD COLUMN "lastSyncAt" TIMESTAMP(3),
  ADD COLUMN "lastError" TEXT;

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastApptAt" TIMESTAMP(3),
    "nextApptAt" TIMESTAMP(3),
    "optedOut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConnectedIntegration_provider_idx" ON "ConnectedIntegration"("provider");
CREATE INDEX "ConnectedIntegration_externalUserId_idx" ON "ConnectedIntegration"("externalUserId");
CREATE INDEX "Client_userId_idx" ON "Client"("userId");
CREATE UNIQUE INDEX "Client_userId_email_key" ON "Client"("userId", "email");
CREATE UNIQUE INDEX "Client_userId_phone_key" ON "Client"("userId", "phone");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
