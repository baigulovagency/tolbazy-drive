-- AlterTable
ALTER TABLE "Order" ADD COLUMN "passengerChatId" TEXT;
ALTER TABLE "Order" ADD COLUMN "passengerMessageId" TEXT;

-- CreateTable
CREATE TABLE "BotText" (
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "label" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotText_pkey" PRIMARY KEY ("key")
);
