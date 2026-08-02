import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("../lib/ai/client", () => ({
  draftModel: "draft-model",
  evalModel: "eval-model",
}));

import { generateText } from "ai";
import { formatMemoryForPrompt } from "../lib/memory/format";
import {
  mergePreferences,
  mergeUniqueStrings,
} from "../lib/memory/merge";
import { extractHeuristicPatch } from "../lib/memory/extract";
import { emptyMemory } from "../lib/memory/types";
import { DefaultMemoryManager } from "../lib/memory/manager";
import type { MemoryStore } from "../lib/memory/store";
import type { UserMemory } from "../lib/memory/types";

const generateTextMock = vi.mocked(generateText);

class InMemoryStore implements MemoryStore {
  private data = new Map<string, UserMemory>();

  async read(userId: string): Promise<UserMemory | null> {
    return this.data.get(userId) ?? null;
  }

  async write(userId: string, memory: UserMemory): Promise<void> {
    this.data.set(userId, memory);
  }

  async delete(userId: string): Promise<void> {
    this.data.delete(userId);
  }
}

describe("mergeUniqueStrings", () => {
  it("dedupes case-insensitively and keeps incoming/newest first", () => {
    expect(
      mergeUniqueStrings(["Alpha", "beta"], ["BETA", "gamma", "alpha"], 10),
    ).toEqual(["BETA", "gamma", "alpha"]);
  });
});

describe("mergePreferences", () => {
  it("merges scalar prefs and unique list items", () => {
    const base = emptyMemory();
    base.preferredTone = "Dry";
    base.frequentlyUsedTerminology = ["rubric"];
    const merged = mergePreferences(base, {
      preferredTone: "Direct",
      frequentlyUsedTerminology: ["Rubric", "eval harness"],
      learningSummary: "Learned direct tone",
    });
    expect(merged.preferredTone).toBe("Direct");
    expect(merged.frequentlyUsedTerminology).toEqual([
      "Rubric",
      "eval harness",
    ]);
    expect(merged.recentLearnings[0]?.summary).toBe("Learned direct tone");
  });
});

describe("formatMemoryForPrompt", () => {
  it("returns empty string when memory has no signal", () => {
    expect(formatMemoryForPrompt(emptyMemory())).toBe("");
  });

  it("includes tone and audience when present", () => {
    const memory = emptyMemory();
    memory.preferredTone = "Wry";
    memory.audience = "DevRel";
    const block = formatMemoryForPrompt(memory);
    expect(block).toContain("Preferred tone: Wry");
    expect(block).toContain("Usual audience: DevRel");
  });
});

describe("extractHeuristicPatch", () => {
  it("infers short paragraphs and carries brief voice", () => {
    const patch = extractHeuristicPatch(
      {
        topic: "Evals",
        audience: "Engineers",
        pov: "Rubrics win",
        voice: "Direct",
      },
      "One.\n\nTwo.\n\nThree.",
    );
    expect(patch.preferredTone).toBe("Direct");
    expect(patch.audience).toBe("Engineers");
    expect(patch.preferredParagraphLength).toBe("short");
  });
});

describe("DefaultMemoryManager", () => {
  beforeEach(() => {
    generateTextMock.mockReset();
    generateTextMock.mockRejectedValue(new Error("skip llm in unit test"));
  });

  it("updates structured preferences without storing documents", async () => {
    const manager = new DefaultMemoryManager(new InMemoryStore(), "test-user");
    const memory = await manager.updateMemory({
      brief: {
        topic: "Pipelines",
        audience: "Writers",
        pov: "Loops beat vibes",
        voice: "Blunt",
      },
      draft: "## Title\n\nA short paragraph about pipelines.\n\nAnother short one.",
      evaluation: null,
    });

    expect(memory.preferredTone).toBe("Blunt");
    expect(memory.audience).toBe("Writers");
    expect(memory.recentLearnings.length).toBeGreaterThan(0);
    expect("recentDocuments" in memory).toBe(false);

    const loaded = await manager.loadMemory();
    expect(loaded.preferredTone).toBe("Blunt");

    const reset = await manager.resetMemory();
    expect(reset.preferredTone).toBeNull();
    expect(reset.recentLearnings).toHaveLength(0);
  });

  it("exposes mergePreferences and extractPreferences on the manager", async () => {
    const manager = new DefaultMemoryManager(new InMemoryStore(), "test-user");
    const patch = await manager.extractPreferences({
      brief: {
        topic: "X",
        audience: "Y",
        pov: "Z",
        voice: "Direct",
      },
      draft: "Hi.\n\nThere.",
    });
    const merged = manager.mergePreferences(emptyMemory("test-user"), patch);
    expect(merged.preferredTone).toBe("Direct");
  });
});
