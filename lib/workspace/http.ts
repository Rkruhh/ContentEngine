import { NextResponse } from "next/server";
import { z } from "zod";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(error: unknown, fallback = "Request failed") {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Invalid request", details: error.flatten() },
      { status: 400 },
    );
  }
  const message = error instanceof Error ? error.message : fallback;
  const status =
    /not found/i.test(message) ? 404 : /rate limit/i.test(message) ? 429 : 500;
  return NextResponse.json({ error: message }, { status });
}
