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

export const evalResultSchema = z.object({
  scores: scoresSchema,
  critique: critiqueSchema,
  top_fixes: z.array(z.string().min(1)).length(3),
});

export type EvalResult = z.infer<typeof evalResultSchema>;

export const briefSchema = z.object({
  topic: z.string().min(1),
  audience: z.string().min(1),
  pov: z.string().min(1),
  voice: z.string().min(1),
});

export type Brief = z.infer<typeof briefSchema>;
