import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// ═══════════════════════════════════════════════════════════════════
// Parse PROJECT-LOG.md for development session features (57+)
// ═══════════════════════════════════════════════════════════════════
function parseProjectLog(content: string) {
  const lines = content.split("\n");
  const features: {
    number: number;
    title: string;
    session: string;
    date: string;
    description: string;
    commit: string;
    status: string;
  }[] = [];

  let currentSession = "";
  let currentDate = "";
  let currentFeature: (typeof features)[number] | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sessionMatch = line.match(/^### (Session \d+(?:\s*\([^)]*\))?)\s*—\s*(.+)$/);
    if (sessionMatch) {
      currentSession = sessionMatch[1].trim();
      currentDate = sessionMatch[2].trim();
      continue;
    }

    const featureMatch = line.match(/^#### (\d+)\.\s+(.+)$/);
    if (featureMatch) {
      if (currentFeature) features.push(currentFeature);
      currentFeature = {
        number: parseInt(featureMatch[1], 10),
        title: featureMatch[2].trim(),
        session: currentSession,
        date: currentDate,
        description: "",
        commit: "",
        status: "\u2705 Deployed",
      };
      continue;
    }

    if (!currentFeature) continue;

    const whatMatch = line.match(/^-\s+\*\*What:\*\*\s*(.+)$/);
    if (whatMatch) { currentFeature.description = whatMatch[1].trim(); continue; }

    const commitMatch = line.match(/^-\s+\*\*Commit:\*\*\s*`?([a-f0-9]+)`?/);
    if (commitMatch) { currentFeature.commit = commitMatch[1].trim(); continue; }

    const statusMatch = line.match(/^-\s+\*\*Status:\*\*\s*(.+)$/);
    if (statusMatch) { currentFeature.status = statusMatch[1].trim(); continue; }
  }

  if (currentFeature) features.push(currentFeature);
  return features;
}

// ═══════════════════════════════════════════════════════════════════
// Parse 05-features.md for complete module/capability breakdown
// ═══════════════════════════════════════════════════════════════════
function parseFeaturesDoc(content: string) {
  const lines = content.split("\n");
  const modules: {
    module: string;
    capabilities: { name: string; description: string }[];
  }[] = [];

  let currentModule = "";
  let currentCaps: { name: string; description: string }[] = [];

  for (const line of lines) {
    const moduleMatch = line.match(/^## (.+)$/);
    if (moduleMatch) {
      if (currentModule && currentCaps.length > 0) {
        modules.push({ module: currentModule, capabilities: [...currentCaps] });
      }
      currentModule = moduleMatch[1].trim();
      currentCaps = [];
      continue;
    }

    const capMatch = line.match(/^- \*\*(.+?)\*\*:\s*(.+)$/);
    if (capMatch && currentModule) {
      currentCaps.push({
        name: capMatch[1].trim(),
        description: capMatch[2].trim(),
      });
    }
  }

  if (currentModule && currentCaps.length > 0) {
    modules.push({ module: currentModule, capabilities: [...currentCaps] });
  }

  return modules;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const view = url.searchParams.get("view") || "all"; // "dev", "modules", "all"

    const logPath = path.join(process.cwd(), "docs", "PROJECT-LOG.md");
    const featuresPath = path.join(process.cwd(), "docs", "05-features.md");

    // Dev features from PROJECT-LOG.md
    let devFeatures: ReturnType<typeof parseProjectLog> = [];
    let logLastModified = "";
    if (fs.existsSync(logPath)) {
      devFeatures = parseProjectLog(fs.readFileSync(logPath, "utf-8"));
      logLastModified = fs.statSync(logPath).mtime.toISOString();
    }

    // Module capabilities from 05-features.md
    let modules: ReturnType<typeof parseFeaturesDoc> = [];
    let totalCapabilities = 0;
    if (fs.existsSync(featuresPath)) {
      modules = parseFeaturesDoc(fs.readFileSync(featuresPath, "utf-8"));
      totalCapabilities = modules.reduce((sum, m) => sum + m.capabilities.length, 0);
    }

    if (view === "dev") {
      return NextResponse.json({
        features: devFeatures,
        total: devFeatures.length,
        lastUpdated: logLastModified,
      });
    }

    if (view === "modules") {
      return NextResponse.json({
        modules,
        totalModules: modules.length,
        totalCapabilities,
        lastUpdated: logLastModified,
      });
    }

    // "all" — combined view for Google Sheets
    return NextResponse.json({
      features: devFeatures,
      totalDevFeatures: devFeatures.length,
      modules,
      totalModules: modules.length,
      totalCapabilities,
      lastUpdated: logLastModified,
    });
  } catch (error) {
    console.error("Error reading features:", error);
    return NextResponse.json(
      { error: "Failed to parse features", features: [], modules: [], total: 0 },
      { status: 500 }
    );
  }
}
