/*
  Warnings:

  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "age" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
-- Insert existing users with a default hashed password (changeme123)
-- This is bcrypt hash for "changeme123" - users will need to reset their passwords
INSERT INTO "new_User" ("age", "createdAt", "email", "id", "name", "updatedAt", "password") 
SELECT "age", "createdAt", "email", "id", "name", "updatedAt", '$2b$10$hoy7pTY4vJcts9Oy0IZm6eIeTbraX/jW.2fXcbmZvykn8HeP49G7C' FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
