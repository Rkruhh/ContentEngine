import {
  createProjectInputSchema,
  getProjectService,
} from "@/lib/workspace/server";
import { jsonError, jsonOk } from "@/lib/workspace/http";

export async function GET() {
  try {
    const projects = await getProjectService().list();
    return jsonOk({ projects });
  } catch (error) {
    return jsonError(error, "Failed to list projects");
  }
}

export async function POST(request: Request) {
  try {
    const body = createProjectInputSchema.parse(await request.json());
    const project = await getProjectService().create(body);
    return jsonOk({ project }, 201);
  } catch (error) {
    return jsonError(error, "Failed to create project");
  }
}
