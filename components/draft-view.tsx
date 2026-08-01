"use client";

import { renderMarkdown } from "@/lib/markdown";

type DraftViewProps = {
  title: string;
  markdown: string;
  emptyLabel?: string;
};

export function DraftView({ title, markdown, emptyLabel }: DraftViewProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <h2 className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
        {title}
      </h2>
      {markdown ? (
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
