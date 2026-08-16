import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { chunkText } from "../lib/knowledge/chunker";
import {
  buildKnowledgeContext,
  buildRetrievalQuery,
} from "../lib/knowledge/context-builder";
import { LocalJsonVectorStore } from "../lib/knowledge/local-json-vector-store";
import {
  parseGithubUrl,
  shouldIngestGithubPath,
} from "../lib/knowledge/parsers/github-fetcher";
import { cosineSimilarity } from "../lib/knowledge/similarity";
import type { KnowledgeChunk } from "../lib/knowledge/types";

describe("chunkText", () => {
  it("splits on headings and keeps code fences intact", () => {
    const text = [
      "# Intro",
      "Paragraph one about APIs.",
      "",
      "```ts",
      "const x = 1;",
      "```",
      "",
      "## Details",
      "More detail here.",
    ].join("\n");
    const chunks = chunkText(text, { chunkSize: 80, chunkOverlap: 10 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some((c) => c.includes("```ts"))).toBe(true);
    expect(chunks.some((c) => c.includes("# Intro") || c.includes("Intro"))).toBe(
      true,
    );
  });

  it("returns empty for blank input", () => {
    expect(chunkText("   \n")).toEqual([]);
  });
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
});

describe("LocalJsonVectorStore project isolation", () => {
  it("never returns chunks from another project", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "kb-vec-"));
    const store = new LocalJsonVectorStore(root);

    const makeChunk = (
      projectId: string,
      sourceId: string,
      text: string,
      embedding: number[],
    ): KnowledgeChunk => ({
      id: `${projectId}-${sourceId}`,
      projectId,
      sourceId,
      text,
      embedding,
      metadata: {
        sourceId,
        sourceName: sourceId,
        sourceType: "markdown",
        projectId,
        chunkIndex: 0,
      },
    });

    await store.addChunks([
      makeChunk("proj-a", "src-a", "Playwright locators", [1, 0, 0]),
      makeChunk("proj-b", "src-b", "Kubernetes pods", [0.9, 0.1, 0]),
    ]);

    const results = await store.search({
      projectId: "proj-a",
      embedding: [1, 0, 0],
      topK: 5,
    });

    expect(results.length).toBe(1);
    expect(results[0]?.chunk.projectId).toBe("proj-a");
    expect(results[0]?.chunk.text).toContain("Playwright");
  });
});

describe("buildKnowledgeContext", () => {
  it("formats citation-ready source labels", () => {
    const built = buildKnowledgeContext([
      {
        score: 0.91,
        chunk: {
          id: "c1",
          projectId: "p1",
          sourceId: "s1",
          text: "Use getByRole for accessible queries.",
          embedding: [1],
          metadata: {
            sourceId: "s1",
            sourceName: "playwright-docs.pdf",
            sourceType: "pdf",
            projectId: "p1",
            chunkIndex: 0,
            pageNumber: 3,
          },
        },
      },
    ]);

    expect(built.promptBlock).toContain("Retrieved project knowledge");
    expect(built.promptBlock).toContain("page 3");
    expect(built.promptBlock).toContain("getByRole");
    expect(built.citations[0]?.pageNumber).toBe(3);
    expect(built.citations[0]?.sourceName).toBe("playwright-docs.pdf");
  });

  it("returns empty block when nothing retrieved", () => {
    expect(buildKnowledgeContext([])).toEqual({
      promptBlock: "",
      citations: [],
    });
  });
});

describe("buildRetrievalQuery", () => {
  it("joins brief fields", () => {
    expect(
      buildRetrievalQuery({
        title: "Locator guide",
        topic: "Playwright",
        documentType: "docs",
        pov: "Prefer role selectors",
      }),
    ).toContain("Playwright");
  });
});

describe("GitHub filters", () => {
  it("parses public HTTPS GitHub URLs only", () => {
    expect(parseGithubUrl("https://github.com/microsoft/playwright")).toEqual({
      owner: "microsoft",
      repo: "playwright",
    });
    expect(parseGithubUrl("http://github.com/microsoft/playwright")).toBeNull();
    expect(
      parseGithubUrl("https://evil.com/microsoft/playwright"),
    ).toBeNull();
    expect(
      parseGithubUrl("https://user:pass@github.com/microsoft/playwright"),
    ).toBeNull();
  });

  it("ignores node_modules, lockfiles, and binaries", () => {
    expect(shouldIngestGithubPath("src/index.ts")).toBe(true);
    expect(shouldIngestGithubPath("README.md")).toBe(true);
    expect(shouldIngestGithubPath("node_modules/pkg/index.js")).toBe(false);
    expect(shouldIngestGithubPath("package-lock.json")).toBe(false);
    expect(shouldIngestGithubPath("assets/logo.png")).toBe(false);
    expect(shouldIngestGithubPath("dist/bundle.js")).toBe(false);
  });
});
