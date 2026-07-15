import { NextResponse } from "next/server";
import { z } from "zod";
import { evalResultSchema } from "@/lib/ai/schema";
import { reviseDraft } from "@/lib/pipeline/run-pipeline";

const bodySchema = z.object({
  draft: z.string().min(1),
  evaluation: evalResultSchema,
});

export async function POST(request: Request) {
  try {
    const { draft, evaluation } = bodySchema.parse(await request.json());
    const revisedDraft = await reviseDraft(draft, evaluation);
    return NextResponse.json({ revisedDraft });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Invalid request", details: error.flatten() },
      { status: 400 },
    );
  }
  const message = error instanceof Error ? error.message : "Revise failed";
  const status = /rate limit/i.test(message) ? 429 : 500;
  return NextResponse.json({ error: message }, { status });
}
