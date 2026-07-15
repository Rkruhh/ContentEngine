import type { RubricKey } from "../lib/harness/rubric";

export type EvalCase = {
  id: string;
  brief: {
    topic: string;
    audience: string;
    pov: string;
    voice: string;
  };
  minScores: Record<RubricKey, number>;
};

export const EVAL_CASES: EvalCase[] = [
  {
    id: "eval-harness-beats-vibes",
    brief: {
      topic: "Why editorial rubrics beat vibe checks for AI drafts",
      audience: "DevRel engineers",
      pov: "What you cannot score, you cannot revise on purpose",
      voice: "Direct and concrete",
    },
    minScores: {
      point_of_view: 6,
      structure: 5,
      tone: 5,
      technical_precision: 5,
      geo_readability: 5,
    },
  },
  {
    id: "geo-for-docs",
    brief: {
      topic: "Designing docs so AI agents can cite them",
      audience: "Technical writers",
      pov: "Atomic claims beat narrative fluff for machine retrieval",
      voice: "Practical and slightly impatient",
    },
    minScores: {
      point_of_view: 6,
      structure: 5,
      tone: 5,
      technical_precision: 6,
      geo_readability: 6,
    },
  },
  {
    id: "model-routing",
    brief: {
      topic: "When to use a cheap eval model vs a strong writer model",
      audience: "AI product engineers",
      pov: "Eval traffic should be cheap; draft quality should not",
      voice: "Opinionated systems thinking",
    },
    minScores: {
      point_of_view: 6,
      structure: 5,
      tone: 5,
      technical_precision: 6,
      geo_readability: 5,
    },
  },
  {
    id: "prompt-vs-pipeline",
    brief: {
      topic: "A prompt is not a content pipeline",
      audience: "Startup content leads",
      pov: "Pipelines need contracts: draft, grade, revise",
      voice: "Blunt portfolio-demo energy",
    },
    minScores: {
      point_of_view: 7,
      structure: 5,
      tone: 5,
      technical_precision: 5,
      geo_readability: 5,
    },
  },
  {
    id: "critique-as-diff",
    brief: {
      topic: "Treat editor critique like a failing test suite",
      audience: "Engineers who write docs",
      pov: "Top fixes should be actionable diffs, not adjectives",
      voice: "Engineering metaphor-forward",
    },
    minScores: {
      point_of_view: 6,
      structure: 5,
      tone: 5,
      technical_precision: 5,
      geo_readability: 5,
    },
  },
  {
    id: "voice-without-filler",
    brief: {
      topic: "Killing AI-blog cadence in technical posts",
      audience: "Content engineers",
      pov: "Distinct voice comes from stance and specifics, not thrills",
      voice: "Dry humor, zero fluff",
    },
    minScores: {
      point_of_view: 6,
      structure: 5,
      tone: 6,
      technical_precision: 5,
      geo_readability: 5,
    },
  },
];
