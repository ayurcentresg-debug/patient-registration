-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientIdNumber" TEXT NOT NULL DEFAULT '',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nricId" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "secondaryMobile" TEXT,
    "landline" TEXT,
    "whatsapp" TEXT,
    "dateOfBirth" DATETIME,
    "age" INTEGER,
    "gender" TEXT NOT NULL,
    "address" TEXT,
    "locality" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "bloodGroup" TEXT,
    "ethnicity" TEXT,
    "nationality" TEXT,
    "occupation" TEXT,
    "referredBy" TEXT,
    "familyRelation" TEXT,
    "familyMemberName" TEXT,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "medicalHistory" TEXT NOT NULL DEFAULT '[]',
    "otherHistory" TEXT,
    "allergies" TEXT,
    "medicalNotes" TEXT,
    "groups" TEXT NOT NULL DEFAULT '[]',
    "photoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Patient" ("address", "allergies", "bloodGroup", "city", "createdAt", "dateOfBirth", "email", "emergencyName", "emergencyPhone", "firstName", "gender", "id", "lastName", "medicalNotes", "phone", "state", "status", "updatedAt", "whatsapp", "zipCode") SELECT "address", "allergies", "bloodGroup", "city", "createdAt", "dateOfBirth", "email", "emergencyName", "emergencyPhone", "firstName", "gender", "id", "lastName", "medicalNotes", "phone", "state", "status", "updatedAt", "whatsapp", "zipCode" FROM "Patient";
DROP TABLE "Patient";
ALTER TABLE "new_Patient" RENAME TO "Patient";
CREATE UNIQUE INDEX "Patient_patientIdNumber_key" ON "Patient"("patientIdNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
