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
CREATE UNIQUE INDEX "OpenSlot_gapletSlotId_key" ON "OpenSlot"("gapletSlotId");

-- AddForeignKey
ALTER TABLE "OpenSlot" ADD CONSTRAINT "OpenSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplacementLog" ADD CONSTRAINT "ReplacementLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
