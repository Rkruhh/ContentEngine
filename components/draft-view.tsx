"use client";

import { useEffect, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";

type DraftViewProps = {
  title: string;
  markdown: string;
  emptyLabel?: string;
  /** When set, enables edit mode with Save edit. */
  editable?: boolean;
  busy?: boolean;
  onSaveEdit?: (content: string) => Promise<void>;
};

export function DraftView({
  title,
  markdown,
  emptyLabel,
  editable,
  busy,
  onSaveEdit,
}: DraftViewProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(markdown);

  useEffect(() => {
    setDraft(markdown);
    setEditing(false);
  }, [markdown]);

  const dirty = draft !== markdown;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
          {title}
        </h2>
        {editable && markdown && onSaveEdit && (
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setDraft(markdown);
                    setEditing(false);
                  }}
                  className="text-xs text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy || !dirty}
                  onClick={() => void onSaveEdit(draft)}
                  className="rounded-sm bg-[var(--ink)] px-2.5 py-1 text-xs font-semibold text-[var(--bg-elevated)] hover:bg-[var(--accent)] disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save edit"}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditing(true)}
                className="text-xs font-medium text-[var(--accent)] disabled:opacity-50"
              >
                Edit
              </button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={busy}
          className="min-h-[20rem] w-full rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] p-4 font-[family-name:var(--font-mono)] text-sm text-[var(--ink)]"
        />
      ) : markdown ? (
        <article
          className="prose-draft max-h-[32rem] overflow-y-auto rounded-sm border border-[var(--line)] bg-[var(--bg-elevated)] p-5"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled markdown renderer
          dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
        />
      ) : (
        <div className="flex min-h-40 items-center justify-center rounded-sm border border-dashed border-[var(--line)] bg-[var(--bg-elevated)]/60 px-4 text-sm text-[var(--muted)]">
          {emptyLabel ?? "No draft yet"}
        </div>
      )}
    </section>
  );
}
