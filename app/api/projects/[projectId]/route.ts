import {
  getProjectService,
  updateProjectInputSchema,
} from "@/lib/workspace/server";
import { jsonError, jsonOk } from "@/lib/workspace/http";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { projectId } = await params;
    const summary = await getProjectService().getSummary(projectId);
    if (!summary) {
      return jsonError(new Error("Project not found"));
    }
    return jsonOk({ project: summary });
  } catch (error) {
    return jsonError(error, "Failed to get project");
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { projectId } = await params;
    const body = updateProjectInputSchema.parse(await request.json());
    const project = await getProjectService().update(projectId, body);
    if (!project) {
      return jsonError(new Error("Project not found"));
    }
    return jsonOk({ project });
  } catch (error) {
    return jsonError(error, "Failed to update project");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { projectId } = await params;
    const ok = await getProjectService().delete(projectId);
    if (!ok) {
      return jsonError(new Error("Project not found"));
    }
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error, "Failed to delete project");
  }
}
