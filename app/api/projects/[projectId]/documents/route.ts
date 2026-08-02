import {
  createDocumentInputSchema,
  getDocumentService,
  getProjectService,
} from "@/lib/workspace/server";
import { jsonError, jsonOk } from "@/lib/workspace/http";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { projectId } = await params;
    const project = await getProjectService().get(projectId);
    if (!project) {
      return jsonError(new Error("Project not found"));
    }
    const documents = await getDocumentService().list(projectId);
    return jsonOk({ documents });
  } catch (error) {
    return jsonError(error, "Failed to list documents");
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { projectId } = await params;
    const body = createDocumentInputSchema.parse(await request.json());
    const document = await getDocumentService().create(projectId, body);
    if (!document) {
      return jsonError(new Error("Project not found"));
    }
    return jsonOk({ document }, 201);
  } catch (error) {
    return jsonError(error, "Failed to create document");
  }
}
