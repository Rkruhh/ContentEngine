import { z } from "zod";

export const LOCAL_USER_ID = "local";

export const paragraphLengthSchema = z.enum(["short", "medium", "long"]);
export type ParagraphLength = z.infer<typeof paragraphLengthSchema>;

export const recentLearningSchema = z.object({
  at: z.string(),
  summary: z.string().min(1),
});

export type RecentLearning = z.infer<typeof recentLearningSchema>;

/**
 * Structured writing preferences for personalization.
 * Intentionally does NOT store full generated documents (not RAG).
 */
export const userMemorySchema = z.object({
  userId: z.string(),
  preferredTone: z.string().nullable(),
  preferredWritingStyle: z.string().nullable(),
  audience: z.string().nullable(),
  preferredParagraphLength: paragraphLengthSchema.nullable(),
  preferredDocumentStructure: z.string().nullable(),
  frequentlyUsedTerminology: z.array(z.string()),
  writingGoals: z.array(z.string()),
  knownPreferences: z.array(z.string()),
  /** Short notes about newly learned prefs — not document bodies. */
  recentLearnings: z.array(recentLearningSchema),
  updatedAt: z.string(),
});

export type UserMemory = z.infer<typeof userMemorySchema>;

/** Partial preference patch extracted from a generation. */
export const memoryPatchSchema = z.object({
  preferredTone: z.string().min(1).optional(),
  preferredWritingStyle: z.string().min(1).optional(),
  audience: z.string().min(1).optional(),
  preferredParagraphLength: paragraphLengthSchema.optional(),
  preferredDocumentStructure: z.string().min(1).optional(),
  frequentlyUsedTerminology: z.array(z.string().min(1)).optional(),
  writingGoals: z.array(z.string().min(1)).optional(),
  knownPreferences: z.array(z.string().min(1)).optional(),
  learningSummary: z.string().min(1).optional(),
});

export type MemoryPatch = z.infer<typeof memoryPatchSchema>;

export type PreferenceSource = {
  brief: {
    topic: string;
    audience: string;
    pov: string;
    voice: string;
  };
  draft: string;
  evaluation?: {
    overall_score?: number;
    strengths?: string[];
    weaknesses?: string[];
  } | null;
};

export function emptyMemory(userId = LOCAL_USER_ID): UserMemory {
  return {
    userId,
    preferredTone: null,
    preferredWritingStyle: null,
    audience: null,
    preferredParagraphLength: null,
    preferredDocumentStructure: null,
    frequentlyUsedTerminology: [],
    writingGoals: [],
    knownPreferences: [],
    recentLearnings: [],
    updatedAt: new Date(0).toISOString(),
  };
}
