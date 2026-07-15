import { NextResponse } from "next/server";
import { z } from "zod";
import { runEval } from "@/lib/harness/run-eval";

const bodySchema = z.object({
  draft: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { draft } = bodySchema.parse(await request.json());
    const evaluation = await runEval(draft);
    return NextResponse.json({ evaluation });
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
  const message = error instanceof Error ? error.message : "Evaluate failed";
  const status = /rate limit/i.test(message) ? 429 : 500;
  return NextResponse.json({ error: message }, { status });
}
