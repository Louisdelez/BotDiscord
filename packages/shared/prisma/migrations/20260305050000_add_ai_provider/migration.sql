-- AlterTable
ALTER TABLE "AIConfig" ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'ollama',
ADD COLUMN     "openaiApiKey" TEXT,
ADD COLUMN     "embedModel" TEXT NOT NULL DEFAULT 'nomic-embed-text';
