-- AlterTable
ALTER TABLE "GuildConfig" ADD COLUMN     "autoExportEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoExportPlatform" TEXT NOT NULL DEFAULT 'github',
ADD COLUMN     "autoExportThreshold" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "Suggestion" ADD COLUMN     "exported" BOOLEAN NOT NULL DEFAULT false;
