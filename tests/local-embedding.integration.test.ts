/**
 * Optional real-model integration.
 * Run with: RUN_LOCAL_EMBEDDING_INTEGRATION=1 npm test -- tests/local-embedding.integration.test.ts
 *
 * Downloads/caches Xenova/all-MiniLM-L6-v2 on first run (may take a minute).
 */
import { describe, expect, it } from "vitest";
import {
  LOCAL_EMBEDDING_DIMENSIONS,
  LocalEmbeddingService,
} from "../lib/knowledge/embedding-service";
import { cosineSimilarity } from "../lib/knowledge/similarity";

const runReal = process.env.RUN_LOCAL_EMBEDDING_INTEGRATION === "1";

describe.skipIf(!runReal)("LocalEmbeddingService real model", () => {
  it(
    "produces 384-d deterministic normalized embeddings",
    async () => {
      const service = new LocalEmbeddingService("Xenova/all-MiniLM-L6-v2");
      const a = await service.embed("Playwright getByRole");
      const b = await service.embed("Playwright getByRole");
      const c = await service.embed("Kubernetes StatefulSet");
      expect(a).toHaveLength(LOCAL_EMBEDDING_DIMENSIONS);
      expect(a).toEqual(b);
      expect(cosineSimilarity(a, c)).toBeLessThan(0.95);
      const many = await service.embedMany(["alpha", "beta"]);
      expect(many).toHaveLength(2);
      expect(many[0]).toHaveLength(LOCAL_EMBEDDING_DIMENSIONS);
    },
    180_000,
  );
});
