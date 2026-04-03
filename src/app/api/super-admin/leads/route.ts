import { NextRequest, NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/super-admin-auth";
import fs from "fs";
import path from "path";

/**
 * Simple JSON-file-based leads store.
 * Stored at <project-root>/data/leads.json
 */

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readLeads(): Lead[] {
  ensureDataDir();
  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, "[]", "utf-8");
    return [];
  }
  try {
    const raw = fs.readFileSync(LEADS_FILE, "utf-8");
    return JSON.parse(raw) as Lead[];
  } catch {
    return [];
  }
}

function writeLeads(leads: Lead[]) {
  ensureDataDir();
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), "utf-8");
}

function generateId(): string {
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * GET /api/super-admin/leads
 * Return all leads.
 */
export async function GET() {
  try {
    const authorized = await isSuperAdmin();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leads = readLeads();
    return NextResponse.json({ leads });
  } catch (error) {
    console.error("[Leads] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/super-admin/leads
 * Create one or more leads.
 * Body: { leads: Array<{ name, email, company, role }> } for bulk
 *   or  { name, email, company, role } for single
 */
export async function POST(req: NextRequest) {
  try {
    const authorized = await isSuperAdmin();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const existingLeads = readLeads();

    // Support both single and bulk create
    const incoming: Array<{
      name: string;
      email: string;
      company: string;
      role: string;
      status?: Lead["status"];
    }> = body.leads ? body.leads : [body];

    const newLeads: Lead[] = [];
    let skipped = 0;

    for (const item of incoming) {
      if (!item.email) {
        skipped++;
        continue;
      }

      // Skip duplicates by email
      if (existingLeads.some((l) => l.email === item.email)) {
        skipped++;
        continue;
      }

      const lead: Lead = {
        id: generateId(),
        name: item.name || "",
        email: item.email.trim(),
        company: item.company || "",
        role: item.role || "",
        status: item.status || "new",
        createdAt: new Date().toISOString(),
      };
      newLeads.push(lead);
      existingLeads.push(lead);
    }

    writeLeads(existingLeads);

    return NextResponse.json({
      success: true,
      created: newLeads.length,
      skipped,
      total: existingLeads.length,
    });
  } catch (error) {
    console.error("[Leads] POST Error:", error);
    return NextResponse.json(
      { error: "Failed to create lead(s)" },
      { status: 500 }
    );
  }
}
