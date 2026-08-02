import type { Brief, EvalResult } from "../ai/schema";
import { extractPreferencePatch } from "./extract";
import { formatMemoryForPrompt } from "./format";
import { mergePreferences as mergePreferencesPure } from "./merge";
import type { MemoryStore } from "./store";
import {
  emptyMemory,
  LOCAL_USER_ID,
  type MemoryPatch,
  type PreferenceSource,
  type UserMemory,
} from "./types";

export type UpdateMemoryInput = {
  brief: Brief;
  draft: string;
  evaluation?: EvalResult | null;
};

/**
 * Application-facing memory API.
 * Pipeline / routes depend on this interface only — never on a concrete store.
 */
export interface MemoryManager {
  loadMemory(): Promise<UserMemory>;
  updateMemory(input: UpdateMemoryInput): Promise<UserMemory>;
  mergePreferences(current: UserMemory, patch: MemoryPatch): UserMemory;
  extractPreferences(input: PreferenceSource): Promise<MemoryPatch>;
  resetMemory(): Promise<UserMemory>;
  /** Convenience: preference block for writer prompts. */
  formatForPrompt(): Promise<string>;
}

/**
 * Default MemoryManager — business logic only; persistence via injected MemoryStore.
 */
export class DefaultMemoryManager implements MemoryManager {
  constructor(
    private readonly store: MemoryStore,
    private readonly userId: string = LOCAL_USER_ID,
  ) {}

  async loadMemory(): Promise<UserMemory> {
    const existing = await this.store.read(this.userId);
    return existing ?? emptyMemory(this.userId);
  }

  mergePreferences(current: UserMemory, patch: MemoryPatch): UserMemory {
    return mergePreferencesPure(current, patch);
  }

  async extractPreferences(input: PreferenceSource): Promise<MemoryPatch> {
    return extractPreferencePatch(input);
  }

  /**
   * Extract prefs from a successful generation, merge into memory, persist.
   * Stores structured preferences only — not document bodies.
   */
  async updateMemory(input: UpdateMemoryInput): Promise<UserMemory> {
    const current = await this.loadMemory();
    const patch = await this.extractPreferences({
      brief: input.brief,
      draft: input.draft,
      evaluation: input.evaluation,
    });
    const next = this.mergePreferences(current, patch);
    await this.store.write(this.userId, {
      ...next,
      userId: this.userId,
      updatedAt: new Date().toISOString(),
    });
    return next;
  }

  async resetMemory(): Promise<UserMemory> {
    await this.store.delete(this.userId);
    const blank = emptyMemory(this.userId);
    await this.store.write(this.userId, blank);
    return blank;
  }

  async formatForPrompt(): Promise<string> {
    return formatMemoryForPrompt(await this.loadMemory());
  }
}
