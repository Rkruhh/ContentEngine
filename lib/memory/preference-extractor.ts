import { randomUUID } from "node:crypto";
import type { DiffResult } from "./diff-service";
import {
  type PreferenceCategory,
  type PreferenceObservation,
  type PreferenceScope,
} from "./preference-observation";

const MARKETING_RE =
  /\b(revolutionary|cutting[- ]edge|seamlessly|unlock|empower|game[- ]changer|world[- ]class|leverage|synergy|delightful)\b/i;

const SENSITIVE_RE =
  /\b(my name is|i am \d+|ssn|social security|credit card|password|religion|democrat|republican|pregnant|diagnosed with)\b/i;

/**
 * Deterministic preference hints from a structured diff.
 * Never claims certainty — observations start at low confidence.
 */
export function extractObservationsFromDiff(input: {
  diff: DiffResult;
  projectId: string;
  documentId: string;
  editId: string;
  documentType?: string;
}): PreferenceObservation[] {
  const { diff, projectId, documentId, editId, documentType } = input;
  const now = new Date().toISOString();
  const observations: PreferenceObservation[] = [];

  const push = (
    category: PreferenceCategory,
    preference: string,
    evidence: string,
    scope: PreferenceScope,
  ) => {
    if (SENSITIVE_RE.test(preference) || SENSITIVE_RE.test(evidence)) {
      return;
    }
    observations.push({
      id: randomUUID(),
      category,
      preference,
      evidence: evidence.slice(0, 400),
      source: "user_edit",
      confidence: 0.35,
      occurrences: 1,
      scope,
      projectId: scope === "project" ? projectId : null,
      documentId,
      editId,
      createdAt: now,
    });
  };

  const removedJoined = diff.removedText.join("\n");
  const addedJoined = diff.addedText.join("\n");

  if (MARKETING_RE.test(removedJoined) && !MARKETING_RE.test(addedJoined)) {
    push(
      "content_avoidances",
      "Avoid promotional/marketing language",
      `Removed promotional wording: ${removedJoined.slice(0, 160)}`,
      "user",
    );
    push(
      "tone",
      "Prefer direct technical language",
      "User removed promotional phrases in favor of plainer wording",
      "user",
    );
  }

  const lengthDelta = diff.addedCharCount - diff.removedCharCount;
  if (diff.removedCharCount > 80 && lengthDelta < -40) {
    push(
      "verbosity",
      "Prefer concise explanations",
      `Net removal of ~${diff.removedCharCount - diff.addedCharCount} characters`,
      "user",
    );
  }
  if (diff.addedCharCount > 120 && lengthDelta > 80) {
    push(
      "verbosity",
      "Prefer more detailed explanations",
      `Net addition of ~${lengthDelta} characters`,
      "user",
    );
  }

  if (diff.changedCodeBlocks > 0 && diff.addedText.some((t) => t.includes("```"))) {
    push(
      "examples",
      "Include practical code examples",
      "User added or expanded fenced code blocks",
      documentType === "api_documentation" ? "project" : "user",
    );
  }

  if (diff.changedHeadings > 0) {
    push(
      "structure",
      "Prefer clearer section structure with headings",
      `Heading changes detected (${diff.changedHeadings})`,
      "user",
    );
  }

  if (
    /\btypescript\b/i.test(addedJoined) &&
    !/\btypescript\b/i.test(removedJoined)
  ) {
    push(
      "terminology",
      "Prefer TypeScript examples",
      "User introduced TypeScript-oriented wording or examples",
      "user",
    );
  }

  if (
    documentType === "api_documentation" &&
    (diff.addedCharCount > 100 || diff.changedCodeBlocks > 0)
  ) {
    push(
      "technical_depth",
      "Prefer detailed API documentation in this project",
      "Substantial edit on an API documentation document",
      "project",
    );
  }

  // Fallback: meaningful edit without a specific heuristic still records a soft observation
  if (observations.length === 0 && diff.changedParagraphs > 0) {
    push(
      "content_preferences",
      "May prefer revised phrasing in generated drafts",
      `Meaningful edit with ${diff.changedParagraphs} paragraph-level changes`,
      "user",
    );
  }

  return observations;
}
