-- AlterTable
ALTER TABLE "AIConfig" ADD COLUMN     "sttEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Confession" ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "modMessageId" TEXT,
ADD COLUMN     "reviewed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "GuildConfig" ADD COLUMN     "confessionModChannelId" TEXT,
ADD COLUMN     "confessionModerationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jiraEmail" TEXT,
ADD COLUMN     "jiraEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jiraProject" TEXT,
ADD COLUMN     "jiraToken" TEXT,
ADD COLUMN     "jiraUrl" TEXT,
ADD COLUMN     "linearApiKey" TEXT,
ADD COLUMN     "linearEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linearTeamId" TEXT,
ADD COLUMN     "pollOfTheDayChannelId" TEXT,
ADD COLUMN     "pollOfTheDayEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pollOfTheDayTime" TEXT NOT NULL DEFAULT '12:00',
ADD COLUMN     "starboardChannelId" TEXT,
ADD COLUMN     "starboardEmoji" TEXT NOT NULL DEFAULT '⭐',
ADD COLUMN     "starboardEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "starboardThreshold" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "trelloBoardId" TEXT,
ADD COLUMN     "trelloEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trelloToken" TEXT,
ADD COLUMN     "welcomeBannerUrl" TEXT,
ADD COLUMN     "welcomeEmbedColor" TEXT,
ADD COLUMN     "welcomeImageUrl" TEXT,
ADD COLUMN     "welcomeUseEmbed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "StarboardEntry" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "originalMessageId" TEXT NOT NULL,
    "originalChannelId" TEXT NOT NULL,
    "starboardMessageId" TEXT,
    "authorId" TEXT NOT NULL,
    "content" TEXT,
    "attachmentUrl" TEXT,
    "starCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StarboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StarboardEntry_originalMessageId_key" ON "StarboardEntry"("originalMessageId");

-- AddForeignKey
ALTER TABLE "StarboardEntry" ADD CONSTRAINT "StarboardEntry_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
