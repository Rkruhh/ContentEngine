import { NextResponse } from "next/server";
import { z } from "zod";
import { briefSchema } from "@/lib/ai/schema";
import { generateDraft } from "@/lib/pipeline/run-pipeline";

export async function POST(request: Request) {
  try {
    const body = briefSchema.parse(await request.json());
    const draft = await generateDraft(body);
    return NextResponse.json({ draft });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Invalid brief", details: error.flatten() },
      { status: 400 },
    );
  }
  const message = error instanceof Error ? error.message : "Draft failed";
  const status = /rate limit/i.test(message) ? 429 : 500;
  return NextResponse.json({ error: message }, { status });
}
