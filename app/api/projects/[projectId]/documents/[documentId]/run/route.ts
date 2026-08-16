import { z } from "zod";
import {
  buildKnowledgeContext,
  buildRetrievalQuery,
  getKnowledgeRetriever,
  getKnowledgeSourceStore,
} from "@/lib/knowledge/server";
import { getMemoryManager } from "@/lib/memory/server";
import { runQualityPipeline } from "@/lib/pipeline/run-pipeline";
import {
  documentBriefSchema,
  getDocumentService,
  getProjectService,
  resolveDocumentBrief,
} from "@/lib/workspace/server";
import { jsonError, jsonOk } from "@/lib/workspace/http";

/**
 * Pipeline entry for the workspace.
 * Receives projectId + documentId only (via URL); storage details stay in services.
 * RAG: retrieve project knowledge → ContextBuilder → knowledgeContext into pipeline.
 */
const runBodySchema = z.object({
  brief: documentBriefSchema.partial().optional(),
  threshold: z.number().min(0).max(10).optional(),
  maxIterations: z.number().int().min(1).max(10).optional(),
});

type Params = {
  params: Promise<{ projectId: string; documentId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { projectId, documentId } = await params;
    const body = runBodySchema.parse(await request.json().catch(() => ({})));

    const project = await getProjectService().get(projectId);
    if (!project) {
      return jsonError(new Error("Project not found"));
    }

    const documentService = getDocumentService();
    const document = await documentService.get(projectId, documentId);
    if (!document) {
      return jsonError(new Error("Document not found"));
    }

    const brief = resolveDocumentBrief(project, document, body.brief);

    let knowledgeContext = "";
    let citations: ReturnType<typeof buildKnowledgeContext>["citations"] = [];
    try {
      const sources = await getKnowledgeSourceStore().listByProject(projectId);
      const ready = sources.filter((s) => s.status === "ready" && s.chunkCount > 0);
      if (ready.length > 0) {
        const query = buildRetrievalQuery({
          title: document.title,
          topic: brief.topic,
          documentType: document.documentType,
          pov: brief.pov,
        });
        const retrieved = await getKnowledgeRetriever().retrieve({
          projectId,
          query,
        });
        const built = buildKnowledgeContext(retrieved);
        knowledgeContext = built.promptBlock;
        citations = built.citations;
      }
    } catch (ragError) {
      // Additive RAG: generation still works without embeddings/sources.
      console.error("Knowledge retrieval skipped:", ragError);
    }

    const result = await runQualityPipeline(brief, {
      threshold: body.threshold,
      maxIterations: body.maxIterations,
      knowledgeContext: knowledgeContext || null,
      projectLearnedPreferences: project.learnedPreferences ?? [],
    });

    const updated = await documentService.addVersion(projectId, documentId, {
      content: result.finalDraft,
      evaluation: result.finalEvaluation,
      iterationCount: result.iterations.length,
      finalScore: result.finalOverallScore,
      stopReason: result.stopReason,
    });

    try {
      await getMemoryManager().updateMemory({
        brief,
        draft: result.finalDraft,
        evaluation: result.finalEvaluation,
      });
    } catch (memoryError) {
      console.error("Memory update failed:", memoryError);
    }

    return jsonOk({
      document: updated,
      pipeline: result,
      knowledge: {
        used: knowledgeContext.length > 0,
        citationCount: citations.length,
        citations,
      },
    });
  } catch (error) {
    return jsonError(error, "Document pipeline failed");
  }
}
