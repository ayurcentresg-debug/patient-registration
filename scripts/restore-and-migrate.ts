/**
 * Restore data from backup DB into new schema DB.
 * Copies all tables, merges Doctor records into User, remaps appointment FKs.
 */
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const backupPath = path.join(process.cwd(), "dev.db.backup");
const newPath = path.join(process.cwd(), "dev.db");

const oldDb = new Database(backupPath, { readonly: true });
const newDb = new Database(newPath);

// Helper: copy all rows from a table
function copyTable(table: string, excludeCols?: string[]) {
  const rows = oldDb.prepare(`SELECT * FROM "${table}"`).all() as Record<string, unknown>[];
  if (rows.length === 0) return 0;

  const cols = Object.keys(rows[0]).filter((c) => !excludeCols?.includes(c));
  const placeholders = cols.map(() => "?").join(", ");
  const colList = cols.map((c) => `"${c}"`).join(", ");
  const insert = newDb.prepare(`INSERT OR IGNORE INTO "${table}" (${colList}) VALUES (${placeholders})`);

  let count = 0;
  for (const row of rows) {
    try {
      insert.run(...cols.map((c) => row[c]));
      count++;
    } catch (e) {
      console.log(`  ⚠️  Skipped row in ${table}: ${(e as Error).message}`);
    }
  }
  return count;
}

async function main() {
  // Clear new DB tables (except _prisma_migrations)
  const tables = newDb
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_prisma%'")
    .all() as { name: string }[];

  // Disable FK checks for bulk operations
  newDb.pragma("foreign_keys = OFF");

  // 1. Copy all non-Doctor, non-User, non-Appointment tables first
  const skipTables = ["Doctor", "User", "Appointment", "_prisma_migrations"];
  for (const { name } of tables) {
    if (skipTables.includes(name)) continue;
    const count = copyTable(name);
    if (count > 0) console.log(`✅ ${name}: ${count} rows`);
  }

  // 2. Copy existing Users from backup
  const oldUsers = oldDb.prepare("SELECT * FROM User").all() as Record<string, unknown>[];
  const userCols = [
    "id", "name", "email", "phone", "role", "password", "isActive", "avatar",
    "totpSecret", "totpEnabled", "lastLogin", "createdAt", "updatedAt",
  ];
  // New columns get defaults
  const newUserCols = [
    ...userCols, "staffIdNumber", "gender", "specialization", "department",
    "consultationFee", "schedule", "slotDuration", "status", "inviteToken", "inviteExpiresAt",
  ];
  const userPlaceholders = newUserCols.map(() => "?").join(", ");
  const userColList = newUserCols.map((c) => `"${c}"`).join(", ");
  const insertUser = newDb.prepare(`INSERT OR IGNORE INTO User (${userColList}) VALUES (${userPlaceholders})`);

  for (const u of oldUsers) {
    insertUser.run(
      ...userCols.map((c) => u[c]),
      null, // staffIdNumber
      null, // gender
      null, // specialization
      null, // department
      null, // consultationFee
      "{}", // schedule
      30,   // slotDuration
      "active", // status
      null, // inviteToken
      null, // inviteExpiresAt
    );
  }
  console.log(`✅ User (existing): ${oldUsers.length} rows`);

  // 3. Import Doctors into User table
  const doctors = oldDb.prepare("SELECT * FROM Doctor").all() as Record<string, unknown>[];
  const doctorIdMap: Record<string, string> = {};

  for (const doc of doctors) {
    const email = (doc.email as string) || `${(doc.name as string).toLowerCase().replace(/[^a-z0-9]/g, "")}@staff.local`;

    // Check if user with this email already exists
    const existing = newDb.prepare("SELECT id FROM User WHERE email = ?").get(email) as { id: string } | undefined;

    if (existing) {
      // Update existing user with clinical fields
      newDb.prepare(`
        UPDATE User SET
          staffIdNumber = ?, gender = ?, specialization = ?, department = ?,
          consultationFee = ?, schedule = ?, slotDuration = ?, status = ?,
          role = ?
        WHERE id = ?
      `).run(
        doc.doctorIdNumber, doc.gender, doc.specialization, doc.department,
        doc.consultationFee, doc.schedule, doc.slotDuration, doc.status,
        doc.role, existing.id,
      );
      doctorIdMap[doc.id as string] = existing.id;
      console.log(`✅ Merged doctor into existing user: ${doc.name} (${email})`);
    } else {
      // Create new user from doctor
      const newId = doc.id as string; // Keep same ID for simpler FK remapping
      insertUser.run(
        newId,          // id (keep original doctor ID)
        doc.name,       // name
        email,          // email
        doc.phone,      // phone
        doc.role,       // role (doctor | therapist)
        "",             // password (empty — needs invite)
        1,              // isActive
        null,           // avatar
        null,           // totpSecret
        0,              // totpEnabled
        null,           // lastLogin
        doc.createdAt,  // createdAt
        doc.updatedAt,  // updatedAt
        doc.doctorIdNumber, // staffIdNumber
        doc.gender,     // gender
        doc.specialization, // specialization
        doc.department, // department
        doc.consultationFee, // consultationFee
        doc.schedule,   // schedule
        doc.slotDuration, // slotDuration
        doc.status,     // status
        null,           // inviteToken
        null,           // inviteExpiresAt
      );
      doctorIdMap[doc.id as string] = newId;
      console.log(`✅ Created user from doctor: ${doc.name} (${doc.doctorIdNumber})`);
    }
  }

  // 4. Copy appointments with remapped doctorId
  const oldAppts = oldDb.prepare("SELECT * FROM Appointment").all() as Record<string, unknown>[];
  const apptCols = Object.keys(oldAppts[0] || {});
  const apptPlaceholders = apptCols.map(() => "?").join(", ");
  const apptColList = apptCols.map((c) => `"${c}"`).join(", ");
  const insertAppt = newDb.prepare(`INSERT OR IGNORE INTO Appointment (${apptColList}) VALUES (${apptPlaceholders})`);

  for (const appt of oldAppts) {
    const oldDoctorId = appt.doctorId as string | null;
    const newDoctorId = oldDoctorId ? (doctorIdMap[oldDoctorId] || oldDoctorId) : null;
    insertAppt.run(...apptCols.map((c) => (c === "doctorId" ? newDoctorId : appt[c])));
  }
  console.log(`✅ Appointment: ${oldAppts.length} rows (doctorId remapped)`);

  // Re-enable FK checks
  newDb.pragma("foreign_keys = ON");

  console.log("\n🎉 Migration complete!");
  console.log(`   Doctor → User mapping:`);
  for (const [oldId, newId] of Object.entries(doctorIdMap)) {
    console.log(`     ${oldId} → ${newId}`);
  }

  oldDb.close();
  newDb.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
