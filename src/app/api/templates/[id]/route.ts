import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const template = await prisma.messageTemplate.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("[Templates GET by ID] Error:", error);
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();

    const existing = await prisma.messageTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const { name, channel, subject, body: templateBody, category, isActive } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (channel !== undefined) data.channel = channel;
    if (subject !== undefined) data.subject = subject;
    if (templateBody !== undefined) data.body = templateBody;
    if (category !== undefined) data.category = category;
    if (isActive !== undefined) data.isActive = isActive;

    // If name or channel changed, check uniqueness
    const finalName = name || existing.name;
    const finalChannel = channel || existing.channel;
    if (name || channel) {
      const duplicate = await prisma.messageTemplate.findFirst({
        where: { name: finalName, channel: finalChannel, id: { not: id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `A template with name "${finalName}" already exists for channel "${finalChannel}"` },
          { status: 409 }
        );
      }
    }

    const template = await prisma.messageTemplate.update({
      where: { id },
      data,
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("[Templates PUT] Error:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const existing = await prisma.messageTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await prisma.messageTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Templates DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
