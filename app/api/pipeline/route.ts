import { NextResponse } from "next/server";
import { z } from "zod";
import { briefSchema } from "@/lib/ai/schema";
import { runQualityPipeline } from "@/lib/pipeline/run-pipeline";

const pipelineBodySchema = briefSchema.extend({
  threshold: z.number().min(0).max(10).optional(),
  maxIterations: z.number().int().min(1).max(10).optional(),
});

export async function POST(request: Request) {
  try {
    const body = pipelineBodySchema.parse(await request.json());
    const { threshold, maxIterations, ...brief } = body;
    const result = await runQualityPipeline(brief, {
      threshold,
      maxIterations,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Invalid pipeline request", details: error.flatten() },
      { status: 400 },
    );
  }
  const message = error instanceof Error ? error.message : "Pipeline failed";
  const status = /rate limit/i.test(message) ? 429 : 500;
  return NextResponse.json({ error: message }, { status });
}
