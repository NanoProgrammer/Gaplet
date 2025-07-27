-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "googleRefreshToken" TEXT,
    "totalReplacements" INTEGER NOT NULL DEFAULT 0,
    "totalCancellations" INTEGER NOT NULL DEFAULT 0,
    "lastReplacementAt" TIMESTAMP(3),
    "lastCancellationAt" TIMESTAMP(3),
    "smsSent" INTEGER NOT NULL DEFAULT 0,
    "emailSent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

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
    "calendarId" TEXT,
    "spreadsheetId" TEXT,
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

-- CreateTable
CREATE TABLE "OpenSlot" (
    "id" TEXT NOT NULL,
    "gapletSlotId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerBookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "serviceVariationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "isTaken" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "takenAt" TIMESTAMP(3),

    CONSTRAINT "OpenSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplacementLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientPhone" TEXT,
    "clientName" TEXT,
    "appointmentTime" TIMESTAMP(3) NOT NULL,
    "provider" TEXT NOT NULL,
    "providerBookingId" TEXT NOT NULL,
    "respondedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplacementLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedIntegration_userId_key" ON "ConnectedIntegration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OpenSlot_gapletSlotId_key" ON "OpenSlot"("gapletSlotId");

-- AddForeignKey
ALTER TABLE "ConnectedIntegration" ADD CONSTRAINT "ConnectedIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenSlot" ADD CONSTRAINT "OpenSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplacementLog" ADD CONSTRAINT "ReplacementLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
