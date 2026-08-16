import { NextResponse } from "next/server";
import { z } from "zod";
import { getMemoryManager } from "@/lib/memory/server";

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

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const learnedOnly = url.searchParams.get("learned") === "1";
    const manager = getMemoryManager();
    const memory = learnedOnly
      ? await manager.resetLearnedPreferences()
      : await manager.resetMemory();
    return NextResponse.json({ memory });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reset memory";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const patchBodySchema = z.object({
  action: z.enum(["delete_learned_preference"]),
  preferenceId: z.string().min(1),
});

export async function PATCH(request: Request) {
  try {
    const body = patchBodySchema.parse(await request.json());
    const memory = await getMemoryManager().deleteLearnedPreference(
      body.preferenceId,
    );
    return NextResponse.json({ memory });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.flatten() },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to update memory";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
