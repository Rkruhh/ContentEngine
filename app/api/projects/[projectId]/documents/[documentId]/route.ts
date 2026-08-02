import {
  getDocumentService,
  updateDocumentInputSchema,
} from "@/lib/workspace/server";
import { jsonError, jsonOk } from "@/lib/workspace/http";

type Params = {
  params: Promise<{ projectId: string; documentId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { projectId, documentId } = await params;
    const document = await getDocumentService().get(projectId, documentId);
    if (!document) {
      return jsonError(new Error("Document not found"));
    }
    return jsonOk({ document });
  } catch (error) {
    return jsonError(error, "Failed to get document");
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { projectId, documentId } = await params;
    const body = updateDocumentInputSchema.parse(await request.json());
    const document = await getDocumentService().update(
      projectId,
      documentId,
      body,
    );
    if (!document) {
      return jsonError(new Error("Document not found"));
    }
    return jsonOk({ document });
  } catch (error) {
    return jsonError(error, "Failed to update document");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { projectId, documentId } = await params;
    const ok = await getDocumentService().delete(projectId, documentId);
    if (!ok) {
      return jsonError(new Error("Document not found"));
    }
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error, "Failed to delete document");
  }
}
