-- CreateTable
CREATE TABLE "Treatment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'therapy',
    "duration" INTEGER NOT NULL DEFAULT 50,
    "basePrice" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TreatmentPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "treatmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "discountPercent" REAL NOT NULL DEFAULT 0,
    "totalPrice" REAL NOT NULL DEFAULT 0,
    "pricePerSession" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TreatmentPackage_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "treatmentId" TEXT,
    "packageId" TEXT,
    "treatmentName" TEXT,
    "packageName" TEXT,
    "sessionPrice" REAL,
    "packageTotal" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Appointment_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Appointment_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TreatmentPackage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("createdAt", "date", "department", "doctor", "doctorId", "duration", "endTime", "id", "isWalkin", "notes", "patientId", "reason", "status", "time", "type", "updatedAt", "walkinName", "walkinPhone") SELECT "createdAt", "date", "department", "doctor", "doctorId", "duration", "endTime", "id", "isWalkin", "notes", "patientId", "reason", "status", "time", "type", "updatedAt", "walkinName", "walkinPhone" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
