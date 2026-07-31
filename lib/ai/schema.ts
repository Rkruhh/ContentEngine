import { z } from "zod";

const scoreValue = z.number().min(0).max(10);

const scoresSchema = z.object({
  point_of_view: scoreValue,
  structure: scoreValue,
  tone: scoreValue,
  technical_precision: scoreValue,
  geo_readability: scoreValue,
});

const critiqueSchema = z.object({
  point_of_view: z.string().min(1),
  structure: z.string().min(1),
  tone: z.string().min(1),
  technical_precision: z.string().min(1),
  geo_readability: z.string().min(1),
});

/** Models often return 1–5 fixes; normalize to exactly 3 for the UI/pipeline. */
const topFixesSchema = z.preprocess((value) => {
  if (!Array.isArray(value)) return value;
  const cleaned = value
    .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
    .filter(Boolean);
  if (cleaned.length === 0) return cleaned;
  while (cleaned.length < 3) {
    cleaned.push(cleaned[cleaned.length - 1]!);
  }
  return cleaned.slice(0, 3);
}, z.array(z.string().min(1)).length(3));

export const evalResultSchema = z.object({
  scores: scoresSchema,
  critique: critiqueSchema,
  top_fixes: topFixesSchema,
});

export type EvalResult = z.infer<typeof evalResultSchema>;

export const briefSchema = z.object({
  topic: z.string().min(1),
  audience: z.string().min(1),
  pov: z.string().min(1),
  voice: z.string().min(1),
});

export type Brief = z.infer<typeof briefSchema>;
