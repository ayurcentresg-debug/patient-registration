-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT,
    "doctorId" TEXT,
    "date" DATETIME NOT NULL,
    "time" TEXT NOT NULL,
    "endTime" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 15,
    "doctor" TEXT NOT NULL,
    "department" TEXT,
    "type" TEXT NOT NULL DEFAULT 'consultation',
    "reason" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "walkinName" TEXT,
    "walkinPhone" TEXT,
    "isWalkin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("createdAt", "date", "department", "doctor", "doctorId", "duration", "endTime", "id", "notes", "patientId", "reason", "status", "time", "type", "updatedAt") SELECT "createdAt", "date", "department", "doctor", "doctorId", "duration", "endTime", "id", "notes", "patientId", "reason", "status", "time", "type", "updatedAt" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
