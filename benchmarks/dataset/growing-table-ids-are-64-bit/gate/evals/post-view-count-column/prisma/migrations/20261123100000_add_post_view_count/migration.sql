-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "readMinutes" INTEGER,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;
