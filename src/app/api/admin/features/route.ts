import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "docs", "PROJECT-LOG.md");

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "PROJECT-LOG.md not found", features: [], total: 0 },
        { status: 404 }
      );
    }

    const content = fs.readFileSync(filePath, "utf-8");
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

      // Match session headers: ### Session X — DATE
      // Also handles "Session 5 (Continued) — 6 Apr 2026"
      const sessionMatch = line.match(
        /^### (Session \d+(?:\s*\([^)]*\))?)\s*—\s*(.+)$/
      );
      if (sessionMatch) {
        currentSession = sessionMatch[1].trim();
        currentDate = sessionMatch[2].trim();
        continue;
      }

      // Match feature headers: #### N. Title
      const featureMatch = line.match(/^#### (\d+)\.\s+(.+)$/);
      if (featureMatch) {
        // Push the previous feature if exists
        if (currentFeature) {
          features.push(currentFeature);
        }
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

      // Match What line
      const whatMatch = line.match(/^-\s+\*\*What:\*\*\s*(.+)$/);
      if (whatMatch) {
        currentFeature.description = whatMatch[1].trim();
        continue;
      }

      // Match Commit line
      const commitMatch = line.match(
        /^-\s+\*\*Commit:\*\*\s*`?([a-f0-9]+)`?/
      );
      if (commitMatch) {
        currentFeature.commit = commitMatch[1].trim();
        continue;
      }

      // Match Status line
      const statusMatch = line.match(/^-\s+\*\*Status:\*\*\s*(.+)$/);
      if (statusMatch) {
        currentFeature.status = statusMatch[1].trim();
        continue;
      }
    }

    // Push the last feature
    if (currentFeature) {
      features.push(currentFeature);
    }

    const stat = fs.statSync(filePath);

    return NextResponse.json({
      features,
      total: features.length,
      lastUpdated: stat.mtime.toISOString(),
    });
  } catch (error) {
    console.error("Error reading PROJECT-LOG.md:", error);
    return NextResponse.json(
      { error: "Failed to parse project log", features: [], total: 0 },
      { status: 500 }
    );
  }
}
