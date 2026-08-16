import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chunkText } from "./chunker";
import type { EmbeddingService } from "./embedding-service";
import { MarkdownParser } from "./parsers/markdown-parser";
import { PdfParser } from "./parsers/pdf-parser";
import { fetchPublicGithubFiles, parseGithubUrl } from "./parsers/github-fetcher";
import type { KnowledgeSourceStore } from "./source-store";
import type { VectorStore } from "./vector-store";
import {
  KNOWLEDGE_LIMITS,
  type KnowledgeChunk,
  type KnowledgeSource,
  type KnowledgeSourceType,
} from "./types";

export type IngestUploadInput = {
  projectId: string;
  name: string;
  type: "pdf" | "markdown";
  filename: string;
  bytes: Buffer;
};

export type IngestGithubInput = {
  projectId: string;
  name?: string;
  url: string;
};

export class KnowledgeIngestService {
  private readonly markdown = new MarkdownParser();
  private readonly pdf = new PdfParser();

  constructor(
    private readonly sources: KnowledgeSourceStore,
    private readonly vectors: VectorStore,
    private readonly embeddings: EmbeddingService,
    private readonly uploadRoot = path.join(
      process.cwd(),
      "data",
      "knowledge",
      "uploads",
    ),
  ) {}

  async ingestUpload(input: IngestUploadInput): Promise<KnowledgeSource> {
    this.assertUpload(input.filename, input.bytes, input.type);
    const sourceId = randomUUID();
    const now = new Date().toISOString();
    const safeName = path.basename(input.filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const storedPath = path.join(this.uploadRoot, input.projectId, `${sourceId}-${safeName}`);
    await mkdir(path.dirname(storedPath), { recursive: true });
    await writeFile(storedPath, input.bytes);

    let source: KnowledgeSource = {
      id: sourceId,
      projectId: input.projectId,
      name: input.name.trim() || safeName,
      type: input.type,
      source: storedPath,
      status: "processing",
      chunkCount: 0,
      errorMessage: null,
      metadata: { originalFilename: safeName },
      createdAt: now,
      updatedAt: now,
    };
    await this.sources.create(source);

    try {
      const chunks =
        input.type === "pdf"
          ? await this.chunksFromPdf(input.projectId, source, input.bytes)
          : await this.chunksFromMarkdown(
              input.projectId,
              source,
              input.bytes.toString("utf8"),
            );
      await this.vectors.addChunks(chunks);
      source = {
        ...source,
        status: "ready",
        chunkCount: chunks.length,
        updatedAt: new Date().toISOString(),
      };
      await this.sources.update(source);
      return source;
    } catch (error) {
      source = {
        ...source,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        updatedAt: new Date().toISOString(),
      };
      await this.sources.update(source);
      throw error;
    }
  }

  async ingestGithub(input: IngestGithubInput): Promise<KnowledgeSource> {
    if (!parseGithubUrl(input.url)) {
      throw new Error("Invalid public GitHub repository URL");
    }
    const sourceId = randomUUID();
    const now = new Date().toISOString();
    let source: KnowledgeSource = {
      id: sourceId,
      projectId: input.projectId,
      name: input.name?.trim() || input.url,
      type: "github",
      source: input.url.trim(),
      status: "processing",
      chunkCount: 0,
      errorMessage: null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };
    await this.sources.create(source);

    try {
      const fetched = await fetchPublicGithubFiles(input.url);
      const allChunks: KnowledgeChunk[] = [];
      let chunkIndex = 0;
      for (const file of fetched.files) {
        const pieces = chunkText(file.content);
        if (pieces.length === 0) continue;
        const embeddings = await this.embeddings.embedMany(pieces);
        for (let i = 0; i < pieces.length; i++) {
          allChunks.push({
            id: randomUUID(),
            projectId: input.projectId,
            sourceId,
            text: pieces[i]!,
            embedding: embeddings[i]!,
            metadata: {
              sourceId,
              sourceName: source.name,
              sourceType: "github",
              projectId: input.projectId,
              chunkIndex,
              githubPath: file.path,
              filePath: file.path,
            },
          });
          chunkIndex += 1;
          if (allChunks.length >= KNOWLEDGE_LIMITS.maxChunksPerSource) break;
        }
        if (allChunks.length >= KNOWLEDGE_LIMITS.maxChunksPerSource) break;
      }
      await this.vectors.addChunks(allChunks);
      source = {
        ...source,
        status: "ready",
        chunkCount: allChunks.length,
        metadata: {
          owner: fetched.owner,
          repo: fetched.repo,
          branch: fetched.defaultBranch,
          fileCount: fetched.files.length,
        },
        updatedAt: new Date().toISOString(),
      };
      await this.sources.update(source);
      return source;
    } catch (error) {
      source = {
        ...source,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        updatedAt: new Date().toISOString(),
      };
      await this.sources.update(source);
      throw error;
    }
  }

  async deleteSource(projectId: string, sourceId: string): Promise<boolean> {
    const existing = await this.sources.getById(projectId, sourceId);
    if (!existing) return false;
    await this.vectors.deleteBySource(projectId, sourceId);
    await this.sources.delete(projectId, sourceId);
    return true;
  }

  private assertUpload(
    filename: string,
    bytes: Buffer,
    type: KnowledgeSourceType,
  ) {
    if (bytes.length === 0) throw new Error("Empty file");
    if (bytes.length > KNOWLEDGE_LIMITS.maxUploadBytes) {
      throw new Error(
        `File exceeds ${KNOWLEDGE_LIMITS.maxUploadBytes} byte limit`,
      );
    }
    const lower = filename.toLowerCase();
    if (type === "pdf" && !lower.endsWith(".pdf")) {
      throw new Error("PDF uploads must use a .pdf extension");
    }
    if (
      type === "markdown" &&
      !(lower.endsWith(".md") || lower.endsWith(".markdown") || lower.endsWith(".txt"))
    ) {
      throw new Error("Markdown uploads must use .md, .markdown, or .txt");
    }
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      throw new Error("Invalid filename");
    }
  }

  private async chunksFromMarkdown(
    projectId: string,
    source: KnowledgeSource,
    text: string,
  ): Promise<KnowledgeChunk[]> {
    const parsed = await this.markdown.parse(text);
    const pieces = chunkText(parsed.text);
    const embeddings = await this.embeddings.embedMany(pieces);
    return pieces.map((piece, index) => ({
      id: randomUUID(),
      projectId,
      sourceId: source.id,
      text: piece,
      embedding: embeddings[index]!,
      metadata: {
        sourceId: source.id,
        sourceName: source.name,
        sourceType: "markdown",
        projectId,
        chunkIndex: index,
        filePath: String(source.metadata.originalFilename ?? source.name),
      },
    }));
  }

  private async chunksFromPdf(
    projectId: string,
    source: KnowledgeSource,
    bytes: Buffer,
  ): Promise<KnowledgeChunk[]> {
    const parsed = await this.pdf.parse(bytes);
    const pages = parsed.pages?.length
      ? parsed.pages
      : [{ pageNumber: 1, text: parsed.text }];

    const allChunks: KnowledgeChunk[] = [];
    let chunkIndex = 0;
    for (const page of pages) {
      const pieces = chunkText(page.text);
      if (pieces.length === 0) continue;
      const embeddings = await this.embeddings.embedMany(pieces);
      for (let i = 0; i < pieces.length; i++) {
        allChunks.push({
          id: randomUUID(),
          projectId,
          sourceId: source.id,
          text: pieces[i]!,
          embedding: embeddings[i]!,
          metadata: {
            sourceId: source.id,
            sourceName: source.name,
            sourceType: "pdf",
            projectId,
            chunkIndex,
            pageNumber: page.pageNumber,
            filePath: String(source.metadata.originalFilename ?? source.name),
          },
        });
        chunkIndex += 1;
        if (allChunks.length >= KNOWLEDGE_LIMITS.maxChunksPerSource) {
          return allChunks;
        }
      }
    }
    return allChunks;
  }
}
