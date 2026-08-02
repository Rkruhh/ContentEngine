import type { Brief } from "../ai/schema";
import type { Document, DocumentBrief, Project } from "./types";

/** Resolve pipeline brief from project overrides + document brief (+ optional request overrides). */
export function resolveDocumentBrief(
  project: Project,
  document: Document,
  overrides?: Partial<DocumentBrief>,
): Brief {
  const base = { ...document.brief, ...overrides };
  return {
    topic: base.topic,
    audience: project.preferredAudience?.trim() || base.audience,
    pov: base.pov,
    voice: project.preferredWritingStyle?.trim() || base.voice,
  };
}
