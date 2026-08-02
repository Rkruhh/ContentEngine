import { z } from "zod";
import { evalResultSchema } from "../ai/schema";

/** Extensible document-type registry — add entries here later without schema churn. */
export const DOCUMENT_TYPES = [
  "technical_blog",
  "readme",
  "api_documentation",
  "tutorial",
  "release_notes",
  "troubleshooting_guide",
  "faq",
  "architecture_overview",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  technical_blog: "Technical Blog",
  readme: "README",
  api_documentation: "API Documentation",
  tutorial: "Tutorial",
  release_notes: "Release Notes",
  troubleshooting_guide: "Troubleshooting Guide",
  faq: "FAQ",
  architecture_overview: "Architecture Overview",
};

export const documentTypeSchema = z.enum(DOCUMENT_TYPES);

export const documentBriefSchema = z.object({
  topic: z.string().min(1),
  audience: z.string().min(1),
  pov: z.string().min(1),
  voice: z.string().min(1),
});

export type DocumentBrief = z.infer<typeof documentBriefSchema>;

export const documentVersionSchema = z.object({
  id: z.string(),
  versionNumber: z.number().int().positive(),
  content: z.string(),
  evaluation: evalResultSchema,
  createdAt: z.string(),
  iterationCount: z.number().int().nonnegative(),
  finalScore: z.number(),
  stopReason: z
    .enum(["threshold_reached", "max_iterations", "no_improvement"])
    .optional(),
});

export type DocumentVersion = z.infer<typeof documentVersionSchema>;

export const evaluationHistoryEntrySchema = z.object({
  versionId: z.string(),
  versionNumber: z.number().int().positive(),
  evaluation: evalResultSchema,
  finalScore: z.number(),
  createdAt: z.string(),
});

export type EvaluationHistoryEntry = z.infer<typeof evaluationHistoryEntrySchema>;

export const projectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** Optional project-level style override for drafts. */
  preferredWritingStyle: z.string().nullable(),
  /** Optional project-level audience override. */
  preferredAudience: z.string().nullable(),
  /**
   * Memory scope key — Phase 2 uses "local".
   * Future: "user:{id}" | "project:{id}" | "team:{id}".
   */
  memoryRef: z.string(),
  /** Placeholder for future knowledge-base / GitHub sources. */
  knowledgeSourceIds: z.array(z.string()),
});

export type Project = z.infer<typeof projectSchema>;

export const documentSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string().min(1),
  documentType: documentTypeSchema,
  brief: documentBriefSchema,
  currentVersion: z.number().int().nonnegative(),
  versionHistory: z.array(documentVersionSchema),
  evaluationHistory: z.array(evaluationHistoryEntrySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Document = z.infer<typeof documentSchema>;

export type ProjectSummary = Project & {
  documentCount: number;
  lastUpdated: string;
  averageQuality: number | null;
};

export const createProjectInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  preferredWritingStyle: z.string().nullable().optional(),
  preferredAudience: z.string().nullable().optional(),
});

export const updateProjectInputSchema = createProjectInputSchema.partial();

export const createDocumentInputSchema = z.object({
  title: z.string().min(1),
  documentType: documentTypeSchema,
  brief: documentBriefSchema,
});

export const updateDocumentInputSchema = z.object({
  title: z.string().min(1).optional(),
  documentType: documentTypeSchema.optional(),
  brief: documentBriefSchema.optional(),
  /** Switch which version is current (does not delete others). */
  currentVersion: z.number().int().positive().optional(),
});
