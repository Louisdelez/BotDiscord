-- CreateTable
CREATE TABLE "SetupTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT '📋',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "roles" JSONB NOT NULL DEFAULT '[]',
    "categories" JSONB NOT NULL DEFAULT '[]',
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "sourceGuildId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "likes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetupTemplate_pkey" PRIMARY KEY ("id")
);
