/**
 * Editor agent — thin wrapper over reviseDraft.
 * Future extension: patch-based edits or multi-pass editing strategies.
 */
export {
  formatEditorBrief,
  reviseDraft as editorAgent,
} from "../pipeline/run-pipeline";
