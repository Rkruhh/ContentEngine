export const RUBRIC_DIMENSIONS = [
  {
    key: "point_of_view",
    label: "Point of view",
    description: "does it take a clear, specific stance rather than hedging?",
  },
  {
    key: "structure",
    label: "Structure",
    description: "is the argument logically ordered, each section earning the next?",
  },
  {
    key: "tone",
    label: "Tone",
    description: "is the voice distinct and consistent, or generic AI-blog cadence?",
  },
  {
    key: "technical_precision",
    label: "Technical precision",
    description: "are claims specific and accurate, or vague/hand-wavy?",
  },
  {
    key: "geo_readability",
    label: "GEO readability",
    description:
      "could an AI agent/crawler cleanly extract and cite the key claims?",
  },
] as const;

export type RubricKey = (typeof RUBRIC_DIMENSIONS)[number]["key"];

export const RUBRIC_KEYS = RUBRIC_DIMENSIONS.map((d) => d.key) as [
  RubricKey,
  ...RubricKey[],
];
