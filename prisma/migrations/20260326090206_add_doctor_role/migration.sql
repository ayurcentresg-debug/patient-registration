-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Doctor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "doctorIdNumber" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'doctor',
    "specialization" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "consultationFee" REAL NOT NULL DEFAULT 0,
    "schedule" TEXT NOT NULL DEFAULT '{}',
    "slotDuration" INTEGER NOT NULL DEFAULT 15,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Doctor" ("consultationFee", "createdAt", "department", "doctorIdNumber", "email", "id", "name", "phone", "schedule", "slotDuration", "specialization", "status", "updatedAt") SELECT "consultationFee", "createdAt", "department", "doctorIdNumber", "email", "id", "name", "phone", "schedule", "slotDuration", "specialization", "status", "updatedAt" FROM "Doctor";
DROP TABLE "Doctor";
ALTER TABLE "new_Doctor" RENAME TO "Doctor";
CREATE UNIQUE INDEX "Doctor_doctorIdNumber_key" ON "Doctor"("doctorIdNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
