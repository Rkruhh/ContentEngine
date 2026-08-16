import { z } from "zod";

export const KNOWLEDGE_SOURCE_TYPES = ["pdf", "markdown", "github"] as const;
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

export const KNOWLEDGE_SOURCE_STATUSES = [
  "processing",
  "ready",
  "failed",
] as const;
export type KnowledgeSourceStatus = (typeof KNOWLEDGE_SOURCE_STATUSES)[number];

export const knowledgeSourceSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string().min(1),
  type: z.enum(KNOWLEDGE_SOURCE_TYPES),
  /** Local upload path or public GitHub URL */
  source: z.string().min(1),
  status: z.enum(KNOWLEDGE_SOURCE_STATUSES),
  chunkCount: z.number().int().nonnegative(),
  errorMessage: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type KnowledgeSource = z.infer<typeof knowledgeSourceSchema>;

export const chunkMetadataSchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  sourceType: z.enum(KNOWLEDGE_SOURCE_TYPES),
  projectId: z.string(),
  chunkIndex: z.number().int().nonnegative(),
  filePath: z.string().optional(),
  pageNumber: z.number().int().positive().optional(),
  githubPath: z.string().optional(),
});

export type ChunkMetadata = z.infer<typeof chunkMetadataSchema>;

export type KnowledgeChunk = {
  id: string;
  projectId: string;
  sourceId: string;
  text: string;
  embedding: number[];
  metadata: ChunkMetadata;
};

export type RetrievedChunk = {
  chunk: KnowledgeChunk;
  score: number;
};

/** Ingestion / retrieval limits (security + cost). */
export const KNOWLEDGE_LIMITS = {
  maxUploadBytes: 8 * 1024 * 1024,
  maxGithubFiles: 80,
  maxFileChars: 200_000,
  maxChunksPerSource: 500,
  defaultTopK: 6,
  chunkSize: 900,
  chunkOverlap: 120,
} as const;

export const GITHUB_IGNORE_PATTERNS = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  ".next/",
  "coverage/",
  "vendor/",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  ".DS_Store",
] as const;

export const GITHUB_TEXT_EXTENSIONS = [
  ".md",
  ".markdown",
  ".txt",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".toml",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".rb",
  ".sh",
  ".css",
  ".html",
  ".sql",
] as const;
