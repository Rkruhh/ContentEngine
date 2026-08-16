import type { Brief, EvalResult } from "../ai/schema";
import { PreferenceAggregator } from "./preference-aggregator";
import {
  EditTracker,
  type TrackEditInput,
  type TrackEditResult,
} from "./edit-tracker";
import { extractPreferencePatch } from "./extract";
import { formatMemoryForPrompt } from "./format";
import { mergePreferences as mergePreferencesPure } from "./merge";
import type {
  LearnedPreference,
  PreferenceObservation,
} from "./preference-observation";
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

export type ApplyEditLearningInput = TrackEditInput & {
  projectLearnedPreferences?: LearnedPreference[];
};

export type ApplyEditLearningResult = {
  track: TrackEditResult;
  memory: UserMemory;
  projectLearnedPreferences: LearnedPreference[];
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
  formatForPrompt(): Promise<string>;
  applyEditLearning(
    input: ApplyEditLearningInput,
  ): Promise<ApplyEditLearningResult>;
  deleteLearnedPreference(preferenceId: string): Promise<UserMemory>;
  resetLearnedPreferences(): Promise<UserMemory>;
}

/**
 * Default MemoryManager — business logic only; persistence via injected MemoryStore.
 */
export class DefaultMemoryManager implements MemoryManager {
  private readonly aggregator = new PreferenceAggregator();

  constructor(
    private readonly store: MemoryStore,
    private readonly userId: string = LOCAL_USER_ID,
    private readonly editTracker: EditTracker = new EditTracker(userId),
  ) {}

  async loadMemory(): Promise<UserMemory> {
    const existing = await this.store.read(this.userId);
    const memory = existing ?? emptyMemory(this.userId);
    return {
      ...memory,
      learnedPreferences: memory.learnedPreferences ?? [],
    };
  }

  mergePreferences(current: UserMemory, patch: MemoryPatch): UserMemory {
    return mergePreferencesPure(current, patch);
  }

  async extractPreferences(input: PreferenceSource): Promise<MemoryPatch> {
    return extractPreferencePatch(input);
  }

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
      learnedPreferences: next.learnedPreferences ?? [],
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

  async applyEditLearning(
    input: ApplyEditLearningInput,
  ): Promise<ApplyEditLearningResult> {
    const track = await this.editTracker.trackEdit(input);
    const memory = await this.loadMemory();

    if (!track.meaningful || track.observations.length === 0) {
      return {
        track,
        memory,
        projectLearnedPreferences: input.projectLearnedPreferences ?? [],
      };
    }

    const userObs = track.observations.filter((o) => o.scope === "user");
    const projectObs = track.observations.filter((o) => o.scope === "project");

    let nextMemory = memory;
    if (userObs.length > 0) {
      const learned = this.aggregator.aggregate(
        memory.learnedPreferences ?? [],
        userObs,
      );
      nextMemory = {
        ...memory,
        learnedPreferences: learned,
        recentLearnings: [
          {
            at: new Date().toISOString(),
            summary: summarizeObservations(userObs),
          },
          ...memory.recentLearnings,
        ].slice(0, 15),
        updatedAt: new Date().toISOString(),
      };
      await this.store.write(this.userId, nextMemory);
    }

    const projectLearnedPreferences = this.aggregator.aggregate(
      input.projectLearnedPreferences ?? [],
      projectObs,
    );

    return {
      track,
      memory: nextMemory,
      projectLearnedPreferences,
    };
  }

  async deleteLearnedPreference(preferenceId: string): Promise<UserMemory> {
    const current = await this.loadMemory();
    const next: UserMemory = {
      ...current,
      learnedPreferences: this.aggregator.removePreference(
        current.learnedPreferences ?? [],
        preferenceId,
      ),
      updatedAt: new Date().toISOString(),
    };
    await this.store.write(this.userId, next);
    return next;
  }

  async resetLearnedPreferences(): Promise<UserMemory> {
    const current = await this.loadMemory();
    const next: UserMemory = {
      ...current,
      learnedPreferences: [],
      updatedAt: new Date().toISOString(),
    };
    await this.store.write(this.userId, next);
    return next;
  }
}

function summarizeObservations(obs: PreferenceObservation[]): string {
  const first = obs[0];
  if (!first) return "Learned from user edit";
  if (obs.length === 1) {
    return `Edit observation (low confidence): ${first.preference}`;
  }
  return `Edit observations: ${obs
    .map((o) => o.preference)
    .slice(0, 3)
    .join("; ")}`;
}
