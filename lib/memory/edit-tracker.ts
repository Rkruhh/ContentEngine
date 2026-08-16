import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  DiffService,
  DEFAULT_MEANINGFUL_THRESHOLDS,
  type DiffResult,
  type MeaningfulEditThresholds,
} from "./diff-service";
import { extractObservationsFromDiff } from "./preference-extractor";
import type { PreferenceObservation } from "./preference-observation";

export const editRecordSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  documentId: z.string(),
  baseVersionId: z.string(),
  editedVersionId: z.string(),
  timestamp: z.string(),
  meaningful: z.boolean(),
  changeRatio: z.number(),
  changedCharCount: z.number(),
  observationIds: z.array(z.string()).default([]),
});

export type EditRecord = z.infer<typeof editRecordSchema>;

type EditStoreFile = {
  userId: string;
  edits: EditRecord[];
};

export type TrackEditInput = {
  projectId: string;
  documentId: string;
  baseVersionId: string;
  editedVersionId: string;
  originalContent: string;
  editedContent: string;
  documentType?: string;
  /** When false, skip learning entirely (e.g. accept-without-edit path). */
  userExplicitlyEdited?: boolean;
};

export type TrackEditResult = {
  record: EditRecord | null;
  diff: DiffResult;
  meaningful: boolean;
  observations: PreferenceObservation[];
};

/**
 * Records user edits and produces preference observations for meaningful changes.
 * Does not write Memory — that is MemoryManager's job.
 */
export class EditTracker {
  private readonly diffService = new DiffService();

  constructor(
    private readonly userId = "local",
    private readonly rootDir = path.join(process.cwd(), "data", "memory", "edits"),
    private readonly thresholds: MeaningfulEditThresholds = DEFAULT_MEANINGFUL_THRESHOLDS,
  ) {}

  private filePath() {
    const safe = this.userId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(this.rootDir, `${safe}.json`);
  }

  async listEdits(): Promise<EditRecord[]> {
    const file = await this.load();
    return file.edits;
  }

  async trackEdit(input: TrackEditInput): Promise<TrackEditResult> {
    const diff = this.diffService.compare(
      input.originalContent,
      input.editedContent,
    );

    // No-edit / accept path: identical content must not create learning.
    if (
      input.userExplicitlyEdited === false ||
      diff.identical ||
      input.originalContent === input.editedContent
    ) {
      return {
        record: null,
        diff,
        meaningful: false,
        observations: [],
      };
    }

    const meaningful = this.diffService.isMeaningful(diff, this.thresholds);
    if (!meaningful) {
      const record: EditRecord = {
        id: randomUUID(),
        projectId: input.projectId,
        documentId: input.documentId,
        baseVersionId: input.baseVersionId,
        editedVersionId: input.editedVersionId,
        timestamp: new Date().toISOString(),
        meaningful: false,
        changeRatio: diff.changeRatio,
        changedCharCount: diff.changedCharCount,
        observationIds: [],
      };
      await this.append(record);
      return { record, diff, meaningful: false, observations: [] };
    }

    const observations = extractObservationsFromDiff({
      diff,
      projectId: input.projectId,
      documentId: input.documentId,
      editId: randomUUID(),
      documentType: input.documentType,
    });

    const record: EditRecord = {
      id: observations[0]?.editId ?? randomUUID(),
      projectId: input.projectId,
      documentId: input.documentId,
      baseVersionId: input.baseVersionId,
      editedVersionId: input.editedVersionId,
      timestamp: new Date().toISOString(),
      meaningful: true,
      changeRatio: diff.changeRatio,
      changedCharCount: diff.changedCharCount,
      observationIds: observations.map((o) => o.id),
    };

    // Align observation editId with record id
    for (const obs of observations) {
      obs.editId = record.id;
    }

    await this.append(record);
    return { record, diff, meaningful: true, observations };
  }

  private async load(): Promise<EditStoreFile> {
    try {
      const raw = await readFile(this.filePath(), "utf8");
      const parsed = JSON.parse(raw) as EditStoreFile;
      const edits = (parsed.edits ?? [])
        .map((e) => editRecordSchema.safeParse(e))
        .filter((r) => r.success)
        .map((r) => r.data);
      return { userId: this.userId, edits };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { userId: this.userId, edits: [] };
      }
      throw error;
    }
  }

  private async append(record: EditRecord): Promise<void> {
    const file = await this.load();
    file.edits = [record, ...file.edits].slice(0, 500);
    await mkdir(this.rootDir, { recursive: true });
    const target = this.filePath();
    const temp = `${target}.${process.pid}.tmp`;
    await writeFile(temp, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    await rename(temp, target);
  }
}
