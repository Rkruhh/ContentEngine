import {
  getKnowledgeIngestService,
  getKnowledgeSourceStore,
  getVectorStore,
} from "@/lib/knowledge/server";
import { getProjectService } from "@/lib/workspace/server";
import { jsonError, jsonOk } from "@/lib/workspace/http";

type Params = {
  params: Promise<{ projectId: string; sourceId: string }>;
};

async function assertProject(projectId: string) {
  const project = await getProjectService().get(projectId);
  if (!project) throw new Error("Project not found");
  return project;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { projectId, sourceId } = await params;
    await assertProject(projectId);
    const source = await getKnowledgeSourceStore().getById(projectId, sourceId);
    if (!source) {
      return jsonError(new Error("Knowledge source not found"));
    }
    const chunkCount = await getVectorStore().countBySource(
      projectId,
      sourceId,
    );
    return jsonOk({ source: { ...source, chunkCount } });
  } catch (error) {
    return jsonError(error, "Failed to load knowledge source");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { projectId, sourceId } = await params;
    await assertProject(projectId);
    const deleted = await getKnowledgeIngestService().deleteSource(
      projectId,
      sourceId,
    );
    if (!deleted) {
      return jsonError(new Error("Knowledge source not found"));
    }
    const sources = await getKnowledgeSourceStore().listByProject(projectId);
    await getProjectService().setKnowledgeSourceIds(
      projectId,
      sources.map((s) => s.id),
    );
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error, "Failed to delete knowledge source");
  }
}
