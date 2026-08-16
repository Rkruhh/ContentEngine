import { z } from "zod";
import { getMemoryManager } from "@/lib/memory/server";
import {
  getDocumentService,
  getProjectService,
} from "@/lib/workspace/server";
import { jsonError, jsonOk } from "@/lib/workspace/http";

const editBodySchema = z.object({
  content: z.string(),
  baseVersionId: z.string().min(1),
});

type Params = {
  params: Promise<{ projectId: string; documentId: string }>;
};

/**
 * Save a user edit as a new immutable version, then best-effort learn preferences.
 * Save always succeeds even if learning fails.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { projectId, documentId } = await params;
    const body = editBodySchema.parse(await request.json());

    const projectService = getProjectService();
    const project = await projectService.get(projectId);
    if (!project) return jsonError(new Error("Project not found"));

    const documentService = getDocumentService();
    const document = await documentService.get(projectId, documentId);
    if (!document) return jsonError(new Error("Document not found"));

    const base = document.versionHistory.find(
      (v) => v.id === body.baseVersionId,
    );
    if (!base) return jsonError(new Error("Base version not found"));

    const updated = await documentService.addUserEditVersion(
      projectId,
      documentId,
      {
        content: body.content,
        baseVersionId: body.baseVersionId,
      },
    );
    if (!updated) return jsonError(new Error("Failed to save edit"));

    const editedVersion = updated.versionHistory.find(
      (v) => v.versionNumber === updated.currentVersion,
    );
    if (!editedVersion) {
      return jsonOk({ document: updated, learning: null });
    }

    let learning: {
      meaningful: boolean;
      observationCount: number;
      editId: string | null;
    } | null = null;

    try {
      const result = await getMemoryManager().applyEditLearning({
        projectId,
        documentId,
        baseVersionId: base.id,
        editedVersionId: editedVersion.id,
        originalContent: base.content,
        editedContent: body.content,
        documentType: document.documentType,
        userExplicitlyEdited: true,
        projectLearnedPreferences: project.learnedPreferences ?? [],
      });

      if (
        result.track.meaningful &&
        result.track.observations.some((o) => o.scope === "project")
      ) {
        await projectService.setLearnedPreferences(
          projectId,
          result.projectLearnedPreferences,
        );
      }

      learning = {
        meaningful: result.track.meaningful,
        observationCount: result.track.observations.length,
        editId: result.track.record?.id ?? null,
      };
    } catch (learnError) {
      console.error("Edit learning failed (save kept):", learnError);
    }

    const refreshed = await documentService.get(projectId, documentId);
    return jsonOk({
      document: refreshed ?? updated,
      learning,
    });
  } catch (error) {
    return jsonError(error, "Failed to save document edit");
  }
}
