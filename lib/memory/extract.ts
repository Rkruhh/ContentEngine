import { generateText } from "ai";
import { evalModel } from "../ai/client";
import { parseEvalJson } from "../harness/run-eval";
import {
  memoryPatchSchema,
  type MemoryPatch,
  type ParagraphLength,
  type PreferenceSource,
} from "./types";

function averageParagraphWords(draft: string): number {
  const paragraphs = draft
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return 0;
  const words = paragraphs.map((p) => p.split(/\s+/).filter(Boolean).length);
  return words.reduce((a, b) => a + b, 0) / words.length;
}

function inferParagraphLength(draft: string): ParagraphLength {
  const avg = averageParagraphWords(draft);
  if (avg < 45) return "short";
  if (avg > 90) return "long";
  return "medium";
}

function inferStructure(draft: string): string {
  const headings = draft.match(/^#{1,3}\s+.+$/gm) ?? [];
  if (headings.length >= 3) {
    return "Sectioned markdown with clear H2/H3 progression";
  }
  if (headings.length >= 1) {
    return "Short piece with a titled opening and flowing body";
  }
  return "Compact prose without heavy sectioning";
}

/** Deterministic preferences from brief + draft shape (no model call). */
export function extractHeuristicPatch(
  brief: PreferenceSource["brief"],
  draft: string,
  evaluation?: PreferenceSource["evaluation"],
): MemoryPatch {
  const known: string[] = [];
  if (brief.voice) known.push(`Voice: ${brief.voice}`);
  if (brief.pov) known.push(`Point of view: ${brief.pov}`);
  if (evaluation?.strengths?.[0]) {
    known.push(`Keep succeeding at: ${evaluation.strengths[0]}`);
  }

  return {
    preferredTone: brief.voice,
    preferredWritingStyle: brief.pov
      ? `Opinionated technical writing with stance: ${brief.pov}`
      : undefined,
    audience: brief.audience,
    preferredParagraphLength: inferParagraphLength(draft),
    preferredDocumentStructure: inferStructure(draft),
    writingGoals: brief.topic ? [`Communicate clearly about: ${brief.topic}`] : [],
    knownPreferences: known,
    learningSummary: `From “${brief.topic}” for ${brief.audience}: tone “${brief.voice}”, ${inferParagraphLength(draft)} paragraphs.`,
  };
}

const EXTRACT_SYSTEM = `You extract durable writing preferences from one content generation.
Return ONLY valid JSON (no markdown fences) with any of these optional fields:
{
  "preferredTone": string,
  "preferredWritingStyle": string,
  "audience": string,
  "preferredParagraphLength": "short" | "medium" | "long",
  "preferredDocumentStructure": string,
  "frequentlyUsedTerminology": string[],
  "writingGoals": string[],
  "knownPreferences": string[],
  "learningSummary": string
}
Focus on stable preferences, not one-off topic facts.
Keep lists short (max 8 items). terminology should be reusable phrases/terms.`;

/** LLM enrichment on top of heuristics; falls back silently on failure. */
export async function extractPreferencePatch(
  input: PreferenceSource,
): Promise<MemoryPatch> {
  const heuristic = extractHeuristicPatch(
    input.brief,
    input.draft,
    input.evaluation,
  );

  try {
    const { text } = await generateText({
      model: evalModel,
      system: EXTRACT_SYSTEM,
      prompt: [
        "Brief:",
        JSON.stringify(input.brief, null, 2),
        "",
        "Final draft:",
        input.draft.slice(0, 4000),
        "",
        "Evaluation (may be null):",
        input.evaluation ? JSON.stringify(input.evaluation, null, 2) : "null",
      ].join("\n"),
    });

    const parsed = memoryPatchSchema.safeParse(parseEvalJson(text));
    if (!parsed.success) return heuristic;

    return {
      ...heuristic,
      ...parsed.data,
      frequentlyUsedTerminology: [
        ...(parsed.data.frequentlyUsedTerminology ?? []),
      ],
      writingGoals: [
        ...(parsed.data.writingGoals ?? []),
        ...(heuristic.writingGoals ?? []),
      ],
      knownPreferences: [
        ...(parsed.data.knownPreferences ?? []),
        ...(heuristic.knownPreferences ?? []),
      ],
      learningSummary:
        parsed.data.learningSummary ?? heuristic.learningSummary,
    };
  } catch {
    return heuristic;
  }
}
