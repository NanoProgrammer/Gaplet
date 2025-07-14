-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailSent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastCancellationAt" TIMESTAMP(3),
ADD COLUMN     "lastReplacementAt" TIMESTAMP(3),
ADD COLUMN     "smsSent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalCancellations" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalReplacements" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ConnectedIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "externalUserId" TEXT,
    "externalOrgId" TEXT,
    "webhookId" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),

    CONSTRAINT "ConnectedIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchAppointmentType" BOOLEAN NOT NULL DEFAULT true,
    "notifyBeforeMinutes" INTEGER,
    "notifyAfterMinutes" INTEGER,
    "maxNotificationsPerGap" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedIntegration_userId_key" ON "ConnectedIntegration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- AddForeignKey
ALTER TABLE "ConnectedIntegration" ADD CONSTRAINT "ConnectedIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
