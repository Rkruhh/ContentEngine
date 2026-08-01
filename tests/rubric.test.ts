import { describe, expect, it } from "vitest";
import { parseEvalJson } from "../lib/harness/run-eval";
import { evalResultSchema } from "../lib/ai/schema";
import { RUBRIC_DIMENSIONS, RUBRIC_KEYS } from "../lib/harness/rubric";

const validPayload = {
  scores: {
    point_of_view: 7,
    structure: 6,
    tone: 5,
    technical_precision: 8,
    geo_readability: 6,
  },
  critique: {
    point_of_view: "Clear stance.",
    structure: "Sections progress well.",
    tone: "Slightly flat mid-piece.",
    technical_precision: "Specific and accurate.",
    geo_readability: "Claims are extractable.",
  },
  top_fixes: ["Sharpen the mid-tone.", "Add one concrete example.", "Tighten the close."],
};

describe("rubric", () => {
  it("defines exactly five dimensions with stable keys", () => {
    expect(RUBRIC_DIMENSIONS).toHaveLength(5);
    expect(RUBRIC_KEYS).toEqual([
      "point_of_view",
      "structure",
      "tone",
      "technical_precision",
      "geo_readability",
    ]);
  });
});

describe("parseEvalJson", () => {
  it("parses raw JSON", () => {
    const parsed = parseEvalJson(JSON.stringify(validPayload));
    expect(evalResultSchema.parse(parsed)).toMatchObject(validPayload);
  });

  it("strips markdown fences", () => {
    const fenced = `Here you go:\n\`\`\`json\n${JSON.stringify(validPayload)}\n\`\`\`\n`;
    const parsed = parseEvalJson(fenced);
    expect(evalResultSchema.parse(parsed).scores.point_of_view).toBe(7);
  });

  it("rejects missing JSON object", () => {
    expect(() => parseEvalJson("no json here")).toThrow(/JSON object/);
  });

  it("rejects schema-invalid scores via zod", () => {
    const bad = {
      ...validPayload,
      scores: { ...validPayload.scores, tone: 12 },
    };
    expect(() => evalResultSchema.parse(bad)).toThrow();
  });

  it("normalizes top_fixes longer than 3", () => {
    const parsed = evalResultSchema.parse({
      ...validPayload,
      top_fixes: ["a", "b", "c", "d"],
    });
    expect(parsed.top_fixes).toEqual(["a", "b", "c"]);
  });

  it("pads top_fixes shorter than 3", () => {
    const parsed = evalResultSchema.parse({
      ...validPayload,
      top_fixes: ["Only one fix"],
    });
    expect(parsed.top_fixes).toEqual([
      "Only one fix",
      "Only one fix",
      "Only one fix",
    ]);
  });

  it("defaults structured critic fields for legacy payloads", () => {
    const parsed = evalResultSchema.parse(validPayload);
    expect(parsed.strengths).toEqual([]);
    expect(parsed.weaknesses).toEqual([]);
    expect(parsed.do_not_change).toEqual([]);
    expect(parsed.confidence).toBe("Medium");
    expect(parsed.overall_score).toBe(6.4);
    expect(parsed.prioritized_improvements).toEqual(validPayload.top_fixes);
  });

  it("accepts full structured critic payload", () => {
    const parsed = evalResultSchema.parse({
      ...validPayload,
      overall_score: 6,
      strengths: ["Strong POV"],
      weaknesses: ["Flat middle"],
      prioritized_improvements: ["Fix middle", "Add example", "Tighten close"],
      do_not_change: ["Opening claim"],
      confidence: "high",
    });
    expect(parsed.confidence).toBe("High");
    expect(parsed.strengths).toEqual(["Strong POV"]);
    expect(parsed.do_not_change).toEqual(["Opening claim"]);
    expect(parsed.prioritized_improvements[0]).toBe("Fix middle");
  });
});
