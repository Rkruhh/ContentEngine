"use client";

import { useRef, useState } from "react";
import type { KnowledgeSource } from "@/lib/knowledge";
import { SectionCard } from "@/components/ui/section-card";

type KnowledgePanelProps = {
  sources: KnowledgeSource[];
  loading?: boolean;
  busy?: boolean;
  onUpload: (file: File, name?: string) => Promise<void>;
  onGithub: (url: string, name?: string) => Promise<void>;
  onDelete: (sourceId: string) => Promise<void>;
};

function statusTone(status: KnowledgeSource["status"]): string {
  if (status === "ready") return "text-[var(--accent)]";
  if (status === "failed") return "text-[var(--warn)]";
  return "text-[var(--muted)]";
}

export function KnowledgePanel({
  sources,
  loading,
  busy,
  onUpload,
  onGithub,
  onDelete,
}: KnowledgePanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [localBusy, setLocalBusy] = useState(false);
  const locked = busy || localBusy;

  async function wrap(fn: () => Promise<void>) {
    setLocalBusy(true);
    try {
      await fn();
    } finally {
      setLocalBusy(false);
    }
  }

  return (
    <SectionCard
      title="Knowledge Base"
      description="Project-scoped sources for grounded generation (RAG)"
    >
      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading sources…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            {sources.length === 0 ? (
              <li className="text-sm text-[var(--muted)]">
                No sources yet — upload a PDF/Markdown file or add a public
                GitHub repo.
              </li>
            ) : (
              sources.map((source) => (
                <li
                  key={source.id}
                  className="rounded-sm border border-[var(--line)] bg-[var(--bg)] px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--ink)]">
                        {source.name}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        {source.type}
                        {" · "}
                        <span className={statusTone(source.status)}>
                          {source.status}
                        </span>
                        {source.status === "ready"
                          ? ` · ${source.chunkCount} chunks`
                          : ""}
                      </p>
                      {source.errorMessage && (
                        <p className="mt-1 text-xs text-[var(--warn)]">
                          {source.errorMessage}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => void wrap(() => onDelete(source.id))}
                      className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--warn)] disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>

          <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-3">
            <p className="text-xs tracking-wide text-[var(--muted)] uppercase">
              Upload PDF / Markdown
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain"
              disabled={locked}
              className="text-xs text-[var(--muted)] file:mr-2 file:rounded-sm file:border file:border-[var(--line)] file:bg-[var(--bg-elevated)] file:px-2 file:py-1 file:text-xs"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void wrap(async () => {
                  await onUpload(file);
                  if (fileRef.current) fileRef.current.value = "";
                });
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs tracking-wide text-[var(--muted)] uppercase">
              Public GitHub repo
            </p>
            <input
              type="url"
              value={githubUrl}
              disabled={locked}
              placeholder="https://github.com/owner/repo"
              onChange={(event) => setGithubUrl(event.target.value)}
              className="w-full rounded-sm border border-[var(--line)] bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--ink)]"
            />
            <button
              type="button"
              disabled={locked || !githubUrl.trim()}
              onClick={() =>
                void wrap(async () => {
                  await onGithub(githubUrl.trim());
                  setGithubUrl("");
                })
              }
              className="rounded-sm border border-[var(--line)] px-2.5 py-1.5 text-xs font-medium text-[var(--ink)] hover:border-[var(--accent)] disabled:opacity-50"
            >
              {localBusy ? "Ingesting…" : "Add repository"}
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
