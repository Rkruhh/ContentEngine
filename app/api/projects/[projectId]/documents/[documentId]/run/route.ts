import { z } from "zod";
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
    const result = await runQualityPipeline(brief, {
      threshold: body.threshold,
      maxIterations: body.maxIterations,
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
    });
  } catch (error) {
    return jsonError(error, "Document pipeline failed");
  }
}
