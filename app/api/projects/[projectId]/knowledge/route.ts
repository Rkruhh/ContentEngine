import { z } from "zod";
import {
  getKnowledgeIngestService,
  getKnowledgeSourceStore,
} from "@/lib/knowledge/server";
import { getProjectService } from "@/lib/workspace/server";
import { jsonError, jsonOk } from "@/lib/workspace/http";

type Params = {
  params: Promise<{ projectId: string }>;
};

const githubBodySchema = z.object({
  type: z.literal("github"),
  url: z.string().url(),
  name: z.string().min(1).optional(),
});

async function assertProject(projectId: string) {
  const project = await getProjectService().get(projectId);
  if (!project) throw new Error("Project not found");
  return project;
}

async function syncKnowledgeIds(projectId: string) {
  const sources = await getKnowledgeSourceStore().listByProject(projectId);
  await getProjectService().setKnowledgeSourceIds(
    projectId,
    sources.map((s) => s.id),
  );
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { projectId } = await params;
    await assertProject(projectId);
    const sources = await getKnowledgeSourceStore().listByProject(projectId);
    return jsonOk({ sources });
  } catch (error) {
    return jsonError(error, "Failed to list knowledge sources");
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { projectId } = await params;
    await assertProject(projectId);
    const ingest = getKnowledgeIngestService();
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const nameField = form.get("name");
      const typeField = form.get("type");

      if (!(file instanceof File)) {
        throw new Error("file is required");
      }

      const filename = file.name || "upload.bin";
      const lower = filename.toLowerCase();
      let type: "pdf" | "markdown";
      if (typeField === "pdf" || lower.endsWith(".pdf")) {
        type = "pdf";
      } else if (
        typeField === "markdown" ||
        lower.endsWith(".md") ||
        lower.endsWith(".markdown") ||
        lower.endsWith(".txt")
      ) {
        type = "markdown";
      } else {
        throw new Error("Unsupported file type — use PDF or Markdown/text");
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      const source = await ingest.ingestUpload({
        projectId,
        name:
          typeof nameField === "string" && nameField.trim()
            ? nameField.trim()
            : filename,
        type,
        filename,
        bytes,
      });
      await syncKnowledgeIds(projectId);
      return jsonOk({ source }, 201);
    }

    const body = githubBodySchema.parse(await request.json());
    const source = await ingest.ingestGithub({
      projectId,
      url: body.url,
      name: body.name,
    });
    await syncKnowledgeIds(projectId);
    return jsonOk({ source }, 201);
  } catch (error) {
    return jsonError(error, "Knowledge ingest failed");
  }
}
