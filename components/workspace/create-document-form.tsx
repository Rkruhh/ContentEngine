"use client";

import { useState, type FormEvent } from "react";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  type DocumentType,
} from "@/lib/workspace";

type CreateDocumentFormProps = {
  onCreate: (input: {
    title: string;
    documentType: DocumentType;
    brief: {
      topic: string;
      audience: string;
      pov: string;
      voice: string;
    };
  }) => Promise<void>;
  busy?: boolean;
  defaultAudience?: string;
  defaultVoice?: string;
};

export function CreateDocumentForm({
  onCreate,
  busy,
  defaultAudience = "",
  defaultVoice = "",
}: CreateDocumentFormProps) {
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] =
    useState<DocumentType>("technical_blog");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState(defaultAudience);
  const [pov, setPov] = useState("");
  const [voice, setVoice] = useState(defaultVoice);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onCreate({
      title,
      documentType,
      brief: {
        topic: topic || title,
        audience,
        pov,
        voice,
      },
    });
    setTitle("");
    setTopic("");
    setPov("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase text-[var(--muted)]">Title</span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          className="rounded-sm border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase text-[var(--muted)]">Type</span>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as DocumentType)}
          disabled={busy}
          className="rounded-sm border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        >
          {DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {DOCUMENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase text-[var(--muted)]">Topic</span>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={busy}
          placeholder="Defaults to title"
          className="rounded-sm border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase text-[var(--muted)]">Audience</span>
        <input
          required
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          disabled={busy}
          className="rounded-sm border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase text-[var(--muted)]">
          Point of view
        </span>
        <input
          required
          value={pov}
          onChange={(e) => setPov(e.target.value)}
          disabled={busy}
          className="rounded-sm border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase text-[var(--muted)]">Voice</span>
        <input
          required
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          disabled={busy}
          className="rounded-sm border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-sm bg-[var(--ink)] px-3 py-2 text-sm font-semibold text-[var(--bg-elevated)] disabled:opacity-50"
      >
        {busy ? "Creating…" : "Add document"}
      </button>
    </form>
  );
}
