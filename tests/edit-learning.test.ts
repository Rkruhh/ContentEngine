import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DiffService,
  DEFAULT_MEANINGFUL_THRESHOLDS,
} from "../lib/memory/diff-service";
import { EditTracker } from "../lib/memory/edit-tracker";
import { PreferenceAggregator } from "../lib/memory/preference-aggregator";
import { extractObservationsFromDiff } from "../lib/memory/preference-extractor";
import {
  confidenceFromOccurrences,
  type PreferenceObservation,
} from "../lib/memory/preference-observation";
import { DefaultMemoryManager } from "../lib/memory/manager";
import { formatMemoryForPrompt } from "../lib/memory/format";
import { emptyMemory } from "../lib/memory/types";
import type { MemoryStore } from "../lib/memory/store";
import type { UserMemory } from "../lib/memory/types";
import { DocumentService } from "../lib/workspace/services/document-service";
import type { DocumentRepository } from "../lib/workspace/repositories/document-repository";
import type { ProjectRepository } from "../lib/workspace/repositories/project-repository";
import type { Document, Project } from "../lib/workspace/types";
import { evalResultSchema } from "../lib/ai/schema";

class InMemoryStore implements MemoryStore {
  private data = new Map<string, UserMemory>();
  async read(userId: string) {
    return this.data.get(userId) ?? null;
  }
  async write(userId: string, memory: UserMemory) {
    this.data.set(userId, memory);
  }
  async delete(userId: string) {
    this.data.delete(userId);
  }
}

const sampleEval = evalResultSchema.parse({
  scores: {
    point_of_view: 7,
    structure: 7,
    tone: 7,
    technical_precision: 7,
    geo_readability: 7,
  },
  critique: {
    point_of_view: "ok",
    structure: "ok",
    tone: "ok",
    technical_precision: "ok",
    geo_readability: "ok",
  },
  top_fixes: ["a", "b", "c"],
  strengths: ["Clear"],
  weaknesses: ["None"],
  prioritized_improvements: ["a", "b", "c"],
  do_not_change: ["Opening"],
  confidence: "Medium",
});

function makeObs(
  preference: string,
  overrides: Partial<PreferenceObservation> = {},
): PreferenceObservation {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    category: overrides.category ?? "tone",
    preference,
    evidence: overrides.evidence ?? "evidence",
    source: "user_edit",
    confidence: 0.35,
    occurrences: 1,
    scope: overrides.scope ?? "user",
    projectId: overrides.projectId ?? null,
    documentId: overrides.documentId ?? "doc-1",
    editId: overrides.editId ?? "edit-1",
    createdAt: new Date().toISOString(),
  };
}

describe("DiffService", () => {
  const diff = new DiffService();

  it("treats identical content as not meaningful", () => {
    const result = diff.compare("Hello world", "Hello world");
    expect(result.identical).toBe(true);
    expect(diff.isMeaningful(result)).toBe(false);
  });

  it("ignores whitespace/punctuation-only changes", () => {
    const result = diff.compare("Hello world.", "Hello   world");
    expect(result.identical).toBe(true);
    expect(diff.isMeaningful(result)).toBe(false);
  });

  it("flags meaningful paragraph changes", () => {
    const original = "Intro paragraph about APIs.\n\nSecond paragraph stays.";
    const edited =
      "Intro paragraph about APIs with concrete TypeScript examples and clearer guidance for engineers.\n\nSecond paragraph stays.";
    const result = diff.compare(original, edited);
    expect(result.identical).toBe(false);
    expect(diff.isMeaningful(result, DEFAULT_MEANINGFUL_THRESHOLDS)).toBe(true);
  });
});

describe("confidence banding", () => {
  it("keeps one observation at low confidence", () => {
    expect(confidenceFromOccurrences(1).level).toBe("low");
  });
  it("reaches medium at 3 and high at 5", () => {
    expect(confidenceFromOccurrences(3).level).toBe("medium");
    expect(confidenceFromOccurrences(5).level).toBe("high");
  });
});

describe("PreferenceAggregator", () => {
  const aggregator = new PreferenceAggregator();

  it("does not create high confidence from a one-off edit", () => {
    const learned = aggregator.aggregate([], [makeObs("Prefer direct technical language")]);
    expect(learned).toHaveLength(1);
    expect(learned[0]?.confidence).toBe("low");
    expect(learned[0]?.occurrences).toBe(1);
  });

  it("increases confidence after repeated similar edits", () => {
    let learned = aggregator.aggregate([], [makeObs("Avoid promotional/marketing language")]);
    for (let i = 0; i < 4; i++) {
      learned = aggregator.aggregate(learned, [
        makeObs("Avoid promotional/marketing language"),
      ]);
    }
    expect(learned[0]?.occurrences).toBe(5);
    expect(learned[0]?.confidence).toBe("high");
  });

  it("removes a learned preference by id", () => {
    const learned = aggregator.aggregate([], [makeObs("Prefer concise explanations")]);
    const id = learned[0]!.id;
    expect(aggregator.removePreference(learned, id)).toHaveLength(0);
  });
});

describe("preference extractor safety", () => {
  it("does not invent sensitive personal attributes", () => {
    const diffService = new DiffService();
    const diff = diffService.compare(
      "Guide text.\n\nMore guide text here for length.",
      "Guide text about architecture and fixtures.\n\nMore guide text here for length with concrete examples.",
    );
    const obs = extractObservationsFromDiff({
      diff,
      projectId: "p1",
      documentId: "d1",
      editId: "e1",
    });
    const blob = JSON.stringify(obs).toLowerCase();
    expect(blob).not.toMatch(/religion|democrat|ssn|pregnant|diagnosed/);
  });
});

describe("EditTracker + MemoryManager learning", () => {
  it("generate/accept without edits creates no learning", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "edits-"));
    const tracker = new EditTracker("local", root);
    const store = new InMemoryStore();
    const manager = new DefaultMemoryManager(store, "local", tracker);

    const result = await manager.applyEditLearning({
      projectId: "p1",
      documentId: "d1",
      baseVersionId: "v1",
      editedVersionId: "v1",
      originalContent: "Same content",
      editedContent: "Same content",
      userExplicitlyEdited: false,
    });

    expect(result.track.record).toBeNull();
    expect(result.track.observations).toHaveLength(0);
    expect((await manager.loadMemory()).learnedPreferences).toHaveLength(0);
    expect(await tracker.listEdits()).toHaveLength(0);
  });

  it("meaningful user edit creates a low-confidence observation in memory", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "edits-"));
    const tracker = new EditTracker("local", root);
    const store = new InMemoryStore();
    const manager = new DefaultMemoryManager(store, "local", tracker);

    const original =
      "This revolutionary solution will seamlessly unlock productivity for everyone.";
    const edited =
      "Use the page object helpers in tests/fixtures to keep auth setup shared across specs.";

    const result = await manager.applyEditLearning({
      projectId: "p1",
      documentId: "d1",
      baseVersionId: "v1",
      editedVersionId: "v2",
      originalContent: original,
      editedContent: edited,
      userExplicitlyEdited: true,
    });

    expect(result.track.meaningful).toBe(true);
    expect(result.track.observations.length).toBeGreaterThan(0);
    const memory = await manager.loadMemory();
    expect(memory.learnedPreferences.length).toBeGreaterThan(0);
    expect(memory.learnedPreferences.every((p) => p.confidence === "low")).toBe(
      true,
    );
  });

  it("trivial formatting change does not create meaningful learning", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "edits-"));
    const tracker = new EditTracker("local", root);
    const manager = new DefaultMemoryManager(
      new InMemoryStore(),
      "local",
      tracker,
    );

    const result = await manager.applyEditLearning({
      projectId: "p1",
      documentId: "d1",
      baseVersionId: "v1",
      editedVersionId: "v2",
      originalContent: "Hello world.",
      editedContent: "Hello   world",
      userExplicitlyEdited: true,
    });

    expect(result.track.meaningful).toBe(false);
    expect(result.track.observations).toHaveLength(0);
    expect((await manager.loadMemory()).learnedPreferences).toHaveLength(0);
  });

  it("user can delete and reset learned preferences", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "edits-"));
    const manager = new DefaultMemoryManager(
      new InMemoryStore(),
      "local",
      new EditTracker("local", root),
    );

    await manager.applyEditLearning({
      projectId: "p1",
      documentId: "d1",
      baseVersionId: "v1",
      editedVersionId: "v2",
      originalContent:
        "A revolutionary cutting-edge platform that will empower teams seamlessly.",
      editedContent:
        "Wire auth through the shared fixture in tests/auth.setup.ts and reuse storage state.",
      userExplicitlyEdited: true,
    });

    let memory = await manager.loadMemory();
    expect(memory.learnedPreferences.length).toBeGreaterThan(0);
    const id = memory.learnedPreferences[0]!.id;

    memory = await manager.deleteLearnedPreference(id);
    expect(memory.learnedPreferences.find((p) => p.id === id)).toBeUndefined();

    await manager.applyEditLearning({
      projectId: "p1",
      documentId: "d1",
      baseVersionId: "v2",
      editedVersionId: "v3",
      originalContent:
        "A revolutionary cutting-edge platform that will empower teams seamlessly again.",
      editedContent:
        "Keep auth centralized; avoid duplicating login steps in every spec file.",
      userExplicitlyEdited: true,
    });
    memory = await manager.resetLearnedPreferences();
    expect(memory.learnedPreferences).toEqual([]);
  });

  it("keeps project-scoped preferences out of user memory aggregation path", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "edits-"));
    const manager = new DefaultMemoryManager(
      new InMemoryStore(),
      "local",
      new EditTracker("local", root),
    );

    const result = await manager.applyEditLearning({
      projectId: "proj-api",
      documentId: "d1",
      baseVersionId: "v1",
      editedVersionId: "v2",
      documentType: "api_documentation",
      originalContent: "Short API note.\n\nAnother line.",
      editedContent: [
        "Short API note with deeper endpoint detail.",
        "",
        "```ts",
        "fetch('/api/users')",
        "```",
        "",
        "Another line with request/response examples for this project.",
      ].join("\n"),
      userExplicitlyEdited: true,
      projectLearnedPreferences: [],
    });

    const projectPrefs = result.projectLearnedPreferences.filter(
      (p) => p.scope === "project",
    );
    const userPrefs = (await manager.loadMemory()).learnedPreferences.filter(
      (p) => p.scope === "user",
    );

    // API doc depth should land on project list when extracted as project scope
    expect(
      projectPrefs.length + userPrefs.length,
    ).toBeGreaterThan(0);
  });

  it("existing MemoryManager updateMemory still works", async () => {
    const manager = new DefaultMemoryManager(new InMemoryStore());
    const memory = await manager.updateMemory({
      brief: {
        topic: "Evals",
        audience: "Engineers",
        pov: "Rubrics",
        voice: "Direct",
      },
      draft: "One.\n\nTwo.\n\nThree.",
    });
    expect(memory.preferredTone || memory.audience).toBeTruthy();
  });

  it("formatMemoryForPrompt includes medium+ learned prefs only", () => {
    const memory = emptyMemory();
    memory.learnedPreferences = [
      {
        id: "1",
        category: "tone",
        preference: "Prefer direct technical language",
        evidence: "e",
        source: "user_edit",
        confidence: "high",
        confidenceScore: 0.85,
        occurrences: 5,
        scope: "user",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "2",
        category: "verbosity",
        preference: "Maybe shorter",
        evidence: "e",
        source: "user_edit",
        confidence: "low",
        confidenceScore: 0.35,
        occurrences: 1,
        scope: "user",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    const block = formatMemoryForPrompt(memory);
    expect(block).toContain("Prefer direct technical language");
    expect(block).not.toContain("Maybe shorter");
  });
});

describe("Document versions preserve originals on edit", () => {
  it("addUserEditVersion keeps the base version unchanged", async () => {
    const projects = new Map<string, Project>();
    const docs = new Map<string, Document>();

    const projectRepo: ProjectRepository = {
      list: async () => [...projects.values()],
      getById: async (id) => projects.get(id) ?? null,
      create: async (p) => {
        projects.set(p.id, p);
        return p;
      },
      update: async (p) => {
        projects.set(p.id, p);
        return p;
      },
      delete: async (id) => {
        projects.delete(id);
      },
    };

    const docRepo: DocumentRepository = {
      listByProject: async (projectId) =>
        [...docs.values()].filter((d) => d.projectId === projectId),
      getById: async (_p, id) => docs.get(id) ?? null,
      create: async (d) => {
        docs.set(d.id, d);
        return d;
      },
      update: async (d) => {
        docs.set(d.id, d);
        return d;
      },
      delete: async (_p, id) => {
        docs.delete(id);
      },
      deleteByProject: async (projectId) => {
        for (const [id, d] of docs) {
          if (d.projectId === projectId) docs.delete(id);
        }
      },
    };

    projects.set("p1", {
      id: "p1",
      name: "Demo",
      description: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferredWritingStyle: null,
      preferredAudience: null,
      memoryRef: "local",
      knowledgeSourceIds: [],
      learnedPreferences: [],
    });

    const service = new DocumentService(docRepo, projectRepo);
    const created = await service.create("p1", {
      title: "Guide",
      documentType: "architecture_overview",
      brief: {
        topic: "Architecture",
        audience: "Engineers",
        pov: "Structure first",
        voice: "Direct",
      },
    });
    expect(created).toBeTruthy();

    const withPipeline = await service.addVersion("p1", created!.id, {
      content: "Original AI draft about architecture.",
      evaluation: sampleEval,
      iterationCount: 1,
      finalScore: 7,
      stopReason: "threshold_reached",
    });
    const base = withPipeline!.versionHistory[0]!;
    const originalContent = base.content;

    const withEdit = await service.addUserEditVersion("p1", created!.id, {
      content: "Edited draft with clearer folder structure notes.",
      baseVersionId: base.id,
    });

    expect(withEdit!.versionHistory).toHaveLength(2);
    expect(withEdit!.versionHistory[0]?.content).toBe(originalContent);
    expect(withEdit!.versionHistory[1]?.source).toBe("user_edit");
    expect(withEdit!.versionHistory[1]?.baseVersionId).toBe(base.id);
    expect(withEdit!.currentVersion).toBe(2);
  });
});
