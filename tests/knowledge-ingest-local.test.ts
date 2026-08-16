import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { EmbeddingService } from "../lib/knowledge/embedding-service";
import { LOCAL_EMBEDDING_DIMENSIONS } from "../lib/knowledge/embedding-service";
import { KnowledgeIngestService } from "../lib/knowledge/ingest-service";
import { LocalJsonVectorStore } from "../lib/knowledge/local-json-vector-store";
import { LocalKnowledgeSourceStore } from "../lib/knowledge/local-source-store";

vi.mock("../lib/knowledge/parsers/pdf-parser", () => ({
  PdfParser: class {
    async parse() {
      return {
        text: "Use getByRole for accessible Playwright queries.",
        pages: [
          {
            pageNumber: 1,
            text: "Use getByRole for accessible Playwright queries.",
          },
        ],
        metadata: { numpages: 1 },
      };
    }
  },
}));

vi.mock("../lib/knowledge/parsers/github-fetcher", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../lib/knowledge/parsers/github-fetcher")
    >();
  return {
    ...actual,
    fetchPublicGithubFiles: vi.fn(async () => ({
      owner: "acme",
      repo: "playwright-kit",
      defaultBranch: "main",
      files: [
        {
          path: "README.md",
          content: "# Kit\n\nPrefer role selectors over CSS.",
        },
      ],
    })),
  };
});

function hashEmbed(text: string): number[] {
  const out = Array.from({ length: LOCAL_EMBEDDING_DIMENSIONS }, () => 0);
  for (let i = 0; i < text.length; i++) {
    const idx = i % LOCAL_EMBEDDING_DIMENSIONS;
    out[idx] = (out[idx] ?? 0) + (text.charCodeAt(i) % 31) / 31;
  }
  const norm = Math.sqrt(out.reduce((sum, v) => sum + v * v, 0)) || 1;
  return out.map((v) => v / norm);
}

class FakeEmbeddingService implements EmbeddingService {
  async embed(text: string): Promise<number[]> {
    return hashEmbed(text);
  }
  async embedMany(texts: string[]): Promise<number[][]> {
    return texts.map((t) => hashEmbed(t));
  }
}

function makeIngest(embeddings: EmbeddingService = new FakeEmbeddingService()) {
  const root = mkdtempSync(path.join(tmpdir(), "kb-no-openai-"));
  const sources = new LocalKnowledgeSourceStore(path.join(root, "sources"));
  const vectors = new LocalJsonVectorStore(path.join(root, "vectors"));
  const ingest = new KnowledgeIngestService(
    sources,
    vectors,
    embeddings,
    path.join(root, "uploads"),
  );
  return { ingest, sources, vectors };
}

describe("Knowledge ingest without OPENAI_API_KEY", () => {
  it("ingests Markdown without OPENAI_API_KEY", async () => {
    // Uses FakeEmbeddingService — no cloud embedding key involved.
    const { ingest, vectors } = makeIngest();
    const source = await ingest.ingestUpload({
      projectId: "p-md",
      name: "guide.md",
      type: "markdown",
      filename: "guide.md",
      bytes: Buffer.from(
        "# Guide\n\nUse getByRole for accessible queries.",
        "utf8",
      ),
    });
    expect(source.status).toBe("ready");
    expect(source.chunkCount).toBeGreaterThan(0);
    expect(await vectors.countBySource("p-md", source.id)).toBe(
      source.chunkCount,
    );
  });

  it("ingests PDF without OPENAI_API_KEY", async () => {
    const { ingest, sources } = makeIngest();
    const source = await ingest.ingestUpload({
      projectId: "p-pdf",
      name: "guide.pdf",
      type: "pdf",
      filename: "guide.pdf",
      bytes: Buffer.from("%PDF-fake-content"),
    });
    expect(source.status).toBe("ready");
    expect(source.chunkCount).toBeGreaterThan(0);
    expect((await sources.getById("p-pdf", source.id))?.status).toBe("ready");
  });

  it("ingests public GitHub without OPENAI_API_KEY", async () => {
    const { ingest } = makeIngest();
    const source = await ingest.ingestGithub({
      projectId: "p-gh",
      url: "https://github.com/acme/playwright-kit",
      name: "playwright-kit",
    });
    expect(source.status).toBe("ready");
    expect(source.chunkCount).toBeGreaterThan(0);
    expect(source.metadata).toMatchObject({
      owner: "acme",
      repo: "playwright-kit",
    });
  });

  it("marks failed embedding as failed (not stuck processing)", async () => {
    const broken: EmbeddingService = {
      embed: async () => {
        throw new Error("model unavailable");
      },
      embedMany: async () => {
        throw new Error("model unavailable");
      },
    };
    const { ingest, sources } = makeIngest(broken);
    await expect(
      ingest.ingestUpload({
        projectId: "p-fail",
        name: "bad.md",
        type: "markdown",
        filename: "bad.md",
        bytes: Buffer.from("# Hi\n\nBody", "utf8"),
      }),
    ).rejects.toThrow(/model unavailable/);

    const listed = await sources.listByProject("p-fail");
    expect(listed).toHaveLength(1);
    expect(listed[0]?.status).toBe("failed");
    expect(listed[0]?.errorMessage).toMatch(/model unavailable/);
  });
});
