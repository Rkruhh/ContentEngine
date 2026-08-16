/**
 * Embedding provider abstraction.
 *
 * Verification (2026-08): Groq chat works, but Groq embeddings are unavailable.
 * Phase 2 now uses a local sentence-transformer via @huggingface/transformers
 * (no OPENAI_API_KEY required for RAG).
 */
export interface EmbeddingService {
  embed(text: string): Promise<number[]>;
  embedMany(texts: string[]): Promise<number[][]>;
}

export const DEFAULT_LOCAL_EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

/** all-MiniLM-L6-v2 mean-pooled embedding size */
export const LOCAL_EMBEDDING_DIMENSIONS = 384;

type FeatureExtractionPipeline = (
  texts: string | string[],
  options?: { pooling?: string; normalize?: boolean },
) => Promise<{ tolist: () => number[] | number[][] }>;

/**
 * Local CPU embeddings via Transformers.js.
 * Model is loaded once (lazy) and reused for all subsequent calls.
 */
export class LocalEmbeddingService implements EmbeddingService {
  private pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;
  private readonly modelId: string;

  constructor(
    modelId = process.env.EMBEDDING_MODEL ?? DEFAULT_LOCAL_EMBEDDING_MODEL,
  ) {
    this.modelId = modelId.trim() || DEFAULT_LOCAL_EMBEDDING_MODEL;
  }

  get model(): string {
    return this.modelId;
  }

  private async getPipeline(): Promise<FeatureExtractionPipeline> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = this.loadPipeline().catch((error) => {
        // Allow a later retry after a failed load.
        this.pipelinePromise = null;
        throw error;
      });
    }
    return this.pipelinePromise;
  }

  private async loadPipeline(): Promise<FeatureExtractionPipeline> {
    try {
      const { pipeline } = await import("@huggingface/transformers");
      const extractor = await pipeline("feature-extraction", this.modelId, {
        // Quantized ONNX weights — smaller download, fine for local CPU demos.
        dtype: "q8",
      });
      return extractor as unknown as FeatureExtractionPipeline;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to load local embedding model "${this.modelId}". Ensure the model can be downloaded/cached and that @huggingface/transformers is installed. Details: ${detail}`,
      );
    }
  }

  async embed(text: string): Promise<number[]> {
    const [embedding] = await this.embedMany([text]);
    if (!embedding) {
      throw new Error("Local embedding model returned an empty result");
    }
    return embedding;
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const extractor = await this.getPipeline();
    try {
      const output = await extractor(texts, {
        pooling: "mean",
        normalize: true,
      });
      const listed = output.tolist();

      // Single input may return a flat vector; batch returns nested arrays.
      const rows: number[][] = Array.isArray(listed[0])
        ? (listed as number[][])
        : [listed as number[]];

      if (rows.length !== texts.length) {
        throw new Error(
          `Local embedding model returned ${rows.length} vectors for ${texts.length} inputs`,
        );
      }

      for (const row of rows) {
        if (row.length === 0) {
          throw new Error("Local embedding model returned an empty vector");
        }
      }

      return rows;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Failed to load local embedding model")
      ) {
        throw error;
      }
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Local embedding inference failed for model "${this.modelId}": ${detail}`,
      );
    }
  }
}
