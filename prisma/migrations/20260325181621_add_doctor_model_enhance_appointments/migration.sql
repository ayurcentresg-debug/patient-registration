-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "doctorIdNumber" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
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

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("createdAt", "date", "department", "doctor", "id", "patientId", "reason", "status", "time", "updatedAt") SELECT "createdAt", "date", "department", "doctor", "id", "patientId", "reason", "status", "time", "updatedAt" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_doctorIdNumber_key" ON "Doctor"("doctorIdNumber");
