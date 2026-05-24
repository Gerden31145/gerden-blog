/*
  Warnings:

  - Made the column `content_html` on table `posts` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `posts` MODIFY `content_html` LONGTEXT NOT NULL;
