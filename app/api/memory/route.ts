import { NextResponse } from "next/server";
import { getMemoryManager } from "@/lib/memory";

export async function GET() {
  try {
    const memory = await getMemoryManager().loadMemory();
    return NextResponse.json({ memory });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load memory";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const memory = await getMemoryManager().resetMemory();
    return NextResponse.json({ memory });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reset memory";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
