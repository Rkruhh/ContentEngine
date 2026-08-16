import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOCAL_EMBEDDING_DIMENSIONS,
  LocalEmbeddingService,
} from "../lib/knowledge/embedding-service";
import { cosineSimilarity } from "../lib/knowledge/similarity";

const mockExtractor = vi.fn();

vi.mock("@huggingface/transformers", () => ({
  pipeline: vi.fn(async () => mockExtractor),
}));

function hashEmbed(text: string, dims = LOCAL_EMBEDDING_DIMENSIONS): number[] {
  const out = Array.from({ length: dims }, () => 0);
  for (let i = 0; i < text.length; i++) {
    const idx = i % dims;
    out[idx] = (out[idx] ?? 0) + (text.charCodeAt(i) % 31) / 31;
  }
  const norm = Math.sqrt(out.reduce((sum, v) => sum + v * v, 0)) || 1;
  return out.map((v) => v / norm);
}

describe("LocalEmbeddingService (mocked pipeline)", () => {
  beforeEach(() => {
    mockExtractor.mockReset();
    mockExtractor.mockImplementation(async (texts: string | string[]) => {
      const list = Array.isArray(texts) ? texts : [texts];
      const rows = list.map((t) => hashEmbed(String(t)));
      return {
        tolist: () => (rows.length === 1 ? (rows[0] ?? []) : rows),
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns embeddings with consistent dimensions", async () => {
    const service = new LocalEmbeddingService("Xenova/all-MiniLM-L6-v2");
    const embedding = await service.embed("Playwright locators");
    expect(embedding).toHaveLength(LOCAL_EMBEDDING_DIMENSIONS);
  });

  it("produces consistent embeddings for the same text", async () => {
    const service = new LocalEmbeddingService();
    const a = await service.embed("same text");
    const b = await service.embed("same text");
    expect(a).toEqual(b);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1);
  });

  it("produces different embeddings for different text", async () => {
    const service = new LocalEmbeddingService();
    const a = await service.embed("kubernetes pods");
    const b = await service.embed("playwright locators");
    expect(a).not.toEqual(b);
    expect(cosineSimilarity(a, b)).toBeLessThan(0.999);
  });

  it("embedMany returns one embedding per input", async () => {
    const service = new LocalEmbeddingService();
    const texts = ["one", "two", "three"];
    const embeddings = await service.embedMany(texts);
    expect(embeddings).toHaveLength(3);
    expect(
      embeddings.every((e) => e.length === LOCAL_EMBEDDING_DIMENSIONS),
    ).toBe(true);
  });

  it("embedMany returns [] for empty input without loading the model", async () => {
    const { pipeline } = await import("@huggingface/transformers");
    const service = new LocalEmbeddingService();
    await expect(service.embedMany([])).resolves.toEqual([]);
    expect(pipeline).not.toHaveBeenCalled();
  });

  it("loads the model once and reuses it", async () => {
    const { pipeline } = await import("@huggingface/transformers");
    const service = new LocalEmbeddingService();
    await service.embed("first");
    await service.embedMany(["second", "third"]);
    expect(pipeline).toHaveBeenCalledTimes(1);
  });

  it("surfaces a clear error when the model fails to load", async () => {
    const { pipeline } = await import("@huggingface/transformers");
    vi.mocked(pipeline).mockRejectedValueOnce(new Error("network down"));
    const service = new LocalEmbeddingService("Xenova/broken-model");
    await expect(service.embed("x")).rejects.toThrow(
      /Failed to load local embedding model/,
    );
  });
});
