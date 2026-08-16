import { z } from "zod";

/** Extensible preference categories learned from edits. */
export const PREFERENCE_CATEGORIES = [
  "tone",
  "verbosity",
  "structure",
  "terminology",
  "examples",
  "formatting",
  "audience",
  "technical_depth",
  "point_of_view",
  "content_preferences",
  "content_avoidances",
] as const;

export type PreferenceCategory = (typeof PREFERENCE_CATEGORIES)[number];

export const preferenceCategorySchema = z.enum(PREFERENCE_CATEGORIES);

export const confidenceLevelSchema = z.enum(["low", "medium", "high"]);
export type ConfidenceLevel = z.infer<typeof confidenceLevelSchema>;

export const preferenceScopeSchema = z.enum(["user", "project"]);
export type PreferenceScope = z.infer<typeof preferenceScopeSchema>;

/**
 * A single observation from one meaningful edit.
 * Not yet a durable memory preference until aggregated.
 */
export const preferenceObservationSchema = z.object({
  id: z.string(),
  category: preferenceCategorySchema,
  preference: z.string().min(1),
  evidence: z.string().min(1),
  source: z.literal("user_edit"),
  confidence: z.number().min(0).max(1),
  occurrences: z.number().int().positive().default(1),
  scope: preferenceScopeSchema.default("user"),
  projectId: z.string().nullable().optional(),
  documentId: z.string().nullable().optional(),
  editId: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type PreferenceObservation = z.infer<typeof preferenceObservationSchema>;

/**
 * Aggregated preference stored in Memory / Project.
 * Confidence rises only after repeated similar observations.
 */
export const learnedPreferenceSchema = z.object({
  id: z.string(),
  category: preferenceCategorySchema,
  preference: z.string().min(1),
  evidence: z.string().min(1),
  source: z.literal("user_edit"),
  confidence: confidenceLevelSchema,
  confidenceScore: z.number().min(0).max(1),
  occurrences: z.number().int().positive(),
  scope: preferenceScopeSchema,
  projectId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type LearnedPreference = z.infer<typeof learnedPreferenceSchema>;

/** Configurable thresholds for confidence banding. */
export const CONFIDENCE_THRESHOLDS = {
  mediumMinOccurrences: 3,
  highMinOccurrences: 5,
  lowScore: 0.35,
  mediumScore: 0.65,
  highScore: 0.85,
} as const;

export function confidenceFromOccurrences(occurrences: number): {
  level: ConfidenceLevel;
  score: number;
} {
  if (occurrences >= CONFIDENCE_THRESHOLDS.highMinOccurrences) {
    return { level: "high", score: CONFIDENCE_THRESHOLDS.highScore };
  }
  if (occurrences >= CONFIDENCE_THRESHOLDS.mediumMinOccurrences) {
    return { level: "medium", score: CONFIDENCE_THRESHOLDS.mediumScore };
  }
  return { level: "low", score: CONFIDENCE_THRESHOLDS.lowScore };
}

export function preferenceObservationKey(
  category: PreferenceCategory,
  preference: string,
): string {
  return `${category}::${preference.trim().toLowerCase().replace(/\s+/g, " ")}`;
}
