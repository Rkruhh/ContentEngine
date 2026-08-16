import {
  LocalEmbeddingService,
  type EmbeddingService,
} from "./embedding-service";
import { KnowledgeIngestService } from "./ingest-service";
import { LocalJsonVectorStore } from "./local-json-vector-store";
import { LocalKnowledgeSourceStore } from "./local-source-store";
import { KnowledgeRetriever } from "./retriever";
import type { KnowledgeSourceStore } from "./source-store";
import type { VectorStore } from "./vector-store";

let sourceStore: KnowledgeSourceStore | null = null;
let vectorStore: VectorStore | null = null;
let embeddingService: EmbeddingService | null = null;
let ingestService: KnowledgeIngestService | null = null;
let retriever: KnowledgeRetriever | null = null;

/**
 * Composition root for knowledge/RAG.
 * Swap LocalJsonVectorStore / LocalEmbeddingService here later.
 */
export function getKnowledgeSourceStore(): KnowledgeSourceStore {
  if (!sourceStore) sourceStore = new LocalKnowledgeSourceStore();
  return sourceStore;
}

export function getVectorStore(): VectorStore {
  if (!vectorStore) vectorStore = new LocalJsonVectorStore();
  return vectorStore;
}

export function getEmbeddingService(): EmbeddingService {
  if (!embeddingService) embeddingService = new LocalEmbeddingService();
  return embeddingService;
}

export function getKnowledgeIngestService(): KnowledgeIngestService {
  if (!ingestService) {
    ingestService = new KnowledgeIngestService(
      getKnowledgeSourceStore(),
      getVectorStore(),
      getEmbeddingService(),
    );
  }
  return ingestService;
}

export function getKnowledgeRetriever(): KnowledgeRetriever {
  if (!retriever) {
    retriever = new KnowledgeRetriever(
      getVectorStore(),
      getEmbeddingService(),
    );
  }
  return retriever;
}

/** Test seam */
export function setKnowledgeServices(input: {
  sources?: KnowledgeSourceStore | null;
  vectors?: VectorStore | null;
  embeddings?: EmbeddingService | null;
  ingest?: KnowledgeIngestService | null;
  retriever?: KnowledgeRetriever | null;
}): void {
  if ("sources" in input) sourceStore = input.sources ?? null;
  if ("vectors" in input) vectorStore = input.vectors ?? null;
  if ("embeddings" in input) embeddingService = input.embeddings ?? null;
  if ("ingest" in input) ingestService = input.ingest ?? null;
  if ("retriever" in input) retriever = input.retriever ?? null;
}
