import { z } from "zod";
import { RUBRIC_KEYS } from "../harness/rubric";

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
    .map((item) =>
      typeof item === "string" ? item.trim() : String(item ?? "").trim(),
    )
    .filter(Boolean);
  if (cleaned.length === 0) return cleaned;
  while (cleaned.length < 3) {
    cleaned.push(cleaned[cleaned.length - 1]!);
  }
  return cleaned.slice(0, 3);
}, z.array(z.string().min(1)).length(3));

const stringListSchema = z.array(z.string().min(1)).default([]);

export const confidenceSchema = z.enum(["Low", "Medium", "High"]);

const confidenceFieldSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (normalized === "low") return "Low";
  if (normalized === "medium") return "Medium";
  if (normalized === "high") return "High";
  return value;
}, confidenceSchema.default("Medium"));

function meanScores(scores: z.infer<typeof scoresSchema>): number {
  const total = RUBRIC_KEYS.reduce((sum, key) => sum + scores[key], 0);
  return total / RUBRIC_KEYS.length;
}

/**
 * Additive structured critic output.
 * Legacy fields (scores, critique, top_fixes) stay required.
 * New fields default so older /api/revise payloads remain valid.
 */
export const evalResultSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const obj = { ...(raw as Record<string, unknown>) };

  // Bridge top_fixes <-> prioritized_improvements for forward/back compat.
  if (
    !obj.top_fixes &&
    Array.isArray(obj.prioritized_improvements) &&
    obj.prioritized_improvements.length > 0
  ) {
    obj.top_fixes = obj.prioritized_improvements;
  }
  if (
    !obj.prioritized_improvements &&
    Array.isArray(obj.top_fixes) &&
    obj.top_fixes.length > 0
  ) {
    obj.prioritized_improvements = obj.top_fixes;
  }

  return obj;
}, z
  .object({
    scores: scoresSchema,
    critique: critiqueSchema,
    top_fixes: topFixesSchema,
    overall_score: z.number().min(0).max(10).optional(),
    strengths: stringListSchema,
    weaknesses: stringListSchema,
    prioritized_improvements: stringListSchema,
    do_not_change: stringListSchema,
    confidence: confidenceFieldSchema,
  })
  .transform((data) => {
    const prioritized =
      data.prioritized_improvements.length > 0
        ? data.prioritized_improvements
        : data.top_fixes;

    return {
      ...data,
      overall_score: data.overall_score ?? meanScores(data.scores),
      prioritized_improvements: prioritized,
    };
  }));

export type EvalResult = z.infer<typeof evalResultSchema>;
export type Confidence = z.infer<typeof confidenceSchema>;

export const briefSchema = z.object({
  topic: z.string().min(1),
  audience: z.string().min(1),
  pov: z.string().min(1),
  voice: z.string().min(1),
});

export type Brief = z.infer<typeof briefSchema>;
